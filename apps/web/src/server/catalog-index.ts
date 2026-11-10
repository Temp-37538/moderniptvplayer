import "server-only";
import prisma from "@moderniptvplayer/db";
import {
	CATALOG_INSERT_BATCH,
	CATALOG_MAX_ROWS,
	CATALOG_TTL_MS,
	SEARCH_CANDIDATES_PER_KIND,
	SYNC_LOCK_MS,
	buildCatalogSearchQuery,
	SYNC_TIMEOUT_MS,
	decideSync,
	pickOpenCategory,
	rankMatch,
	toCatalogRows,
	type CatalogKind,
	type CatalogRowInput,
	type CatalogSyncPolicyState,
	type SyncTrigger,
	syncRetryDelayMs,
} from "./catalog-index-policy";
import {
	CatalogProviderError,
	CatalogSyncTimeoutError,
	CatalogTooLargeError,
	writeCatalogChunks,
} from "./catalog-sync-pipeline";
import { readM3uCatalog } from "./m3u-catalog";
import {
	createXtreamClient,
	type DecryptedPlaylist,
	PLAYLIST_SOURCE_FINGERPRINT_SQL,
	readPlaylistSnapshot,
} from "./xtream";

type CatalogSyncRecord = CatalogSyncPolicyState;

type CatalogEntryCandidate = {
	itemId: string;
	name: string;
	normalizedName: string;
	categoryIds: string[];
	image: string | null;
};

type Playlist = DecryptedPlaylist;

/**
 * Another sync or a playlist edit took the lock, or the playlist now reads
 * another provider, while this sync ran.
 */
class CatalogLockLostError extends Error {}

function errorCode(error: unknown): string {
	if (error instanceof CatalogTooLargeError) {
		return "too_large";
	}
	if (error instanceof CatalogSyncTimeoutError) {
		return "timeout";
	}
	return error instanceof CatalogProviderError ? "provider" : "unknown";
}

/**
 * Rows of one playlist, one kind at a time (channels, movies, series) and one
 * chunk at a time, so the sync never holds every kind's provider listing or
 * every row at once.
 */
async function* catalogRowChunks(
	playlist: Playlist,
): AsyncGenerator<CatalogRowInput[]> {
	if (playlist.source === "M3U") {
		// The parsed M3U playlist is already cached in memory for browsing.
		const parsed = await readM3uCatalog(playlist);
		const lists: Array<[CatalogKind, readonly unknown[]]> = [
			["channel", parsed.live],
			["movie", parsed.movies],
			["series", parsed.shows],
		];
		for (const [kind, items] of lists) {
			const seenIds = new Set<string>();
			for (let start = 0; start < items.length; start += CATALOG_INSERT_BATCH) {
				yield toCatalogRows(
					kind,
					items.slice(start, start + CATALOG_INSERT_BATCH),
					seenIds,
				);
			}
		}
		return;
	}

	const xtream = createXtreamClient(playlist);
	const kinds: Array<[CatalogKind, "channels" | "movies" | "shows"]> = [
		["channel", "channels"],
		["movie", "movies"],
		["series", "shows"],
	];
	for (const [kind, listing] of kinds) {
		const seenIds = new Set<string>();
		for await (const items of xtream.iterateCatalog(
			listing,
			CATALOG_INSERT_BATCH,
		)) {
			yield toCatalogRows(kind, items, seenIds);
		}
	}
}

async function insertCatalogBatch(
	playlistId: string,
	syncId: string,
	rows: readonly CatalogRowInput[],
): Promise<void> {
	if (rows.length === 0) {
		return;
	}

	const values: unknown[] = [];
	const valueRows = rows.map((row) => {
		const first = values.length + 1;
		values.push(
			crypto.randomUUID(),
			playlistId,
			syncId,
			row.kind,
			row.itemId,
			row.name,
			row.normalizedName,
			JSON.stringify(row.categoryIds),
			row.image,
		);
		return `($${first}, $${first + 1}, $${first + 2}, $${first + 3}, $${first + 4}, $${first + 5}, $${first + 6}, ARRAY(SELECT jsonb_array_elements_text($${first + 7}::jsonb)), $${first + 8})`;
	});

	const sql = `INSERT INTO "catalog_entry" ("id", "playlistId", "syncId", "kind", "itemId", "name", "normalizedName", "categoryIds", "image") VALUES ${valueRows.join(", ")} ON CONFLICT ("playlistId", "syncId", "kind", "itemId") DO NOTHING`;
	await prisma.$executeRawUnsafe(sql, ...values);
}

export async function syncCatalog(
	userId: string,
	playlistId: string,
): Promise<void> {
	const startedAt = Date.now();
	let syncId: string | null = null;
	let lockAcquired = false;
	// Fencing token: every later write of this sync requires it, so a sync
	// whose row was reset by a playlist edit, or taken over after its lock
	// expired, can no longer activate its rows or overwrite the status.
	const lockToken = crypto.randomUUID();
	let total = 0;

	try {
		const now = new Date();
		await prisma.$executeRawUnsafe(
			`INSERT INTO "catalog_sync" ("playlistId", "status", "itemCount", "createdAt", "updatedAt")
			 VALUES ($1, 'idle', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			 ON CONFLICT ("playlistId") DO NOTHING`,
			playlistId,
		);

		const lockUntil = new Date(now.getTime() + SYNC_LOCK_MS);
		const lockCount = await prisma.$executeRawUnsafe(
			`UPDATE "catalog_sync"
			 SET "status" = 'syncing', "lockedUntil" = $2, "lastAttemptAt" = $3, "updatedAt" = $3,
			     "lockToken" = $4
			 WHERE "playlistId" = $1
			   AND ("status" <> 'syncing' OR "lockedUntil" < $3)`,
			playlistId,
			lockUntil,
			now,
			lockToken,
		);
		if (lockCount !== 1) {
			return;
		}
		lockAcquired = true;

		// Read the credentials fresh, never from the in-memory cache: a stale
		// copy would index the provider the playlist used before an edit.
		const snapshot = await readPlaylistSnapshot(userId, playlistId);
		if (!snapshot) {
			await prisma.$executeRawUnsafe(
				`UPDATE "catalog_sync"
				 SET "status" = 'idle', "lockedUntil" = NULL, "lockToken" = NULL,
				     "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
				 WHERE "playlistId" = $1 AND "lockToken" = $2`,
				playlistId,
				lockToken,
			);
			return;
		}

		const { playlist, fingerprint } = snapshot;

		const generation = crypto.randomUUID();
		syncId = generation;
		total = await writeCatalogChunks({
			chunks: catalogRowChunks(playlist),
			insert: (rows) => insertCatalogBatch(playlistId, generation, rows),
			deadline: startedAt + SYNC_TIMEOUT_MS,
			maxRows: CATALOG_MAX_ROWS,
			batchSize: CATALOG_INSERT_BATCH,
		});

		const syncedAt = new Date();
		// Both statements run in one transaction. The activation only matches
		// while this sync still holds the token and the playlist still reads
		// the provider this sync fetched, and the cleanup only runs if the
		// activation did, so a stale sync never replaces a newer index.
		const [activated] = await prisma.$transaction([
			prisma.$executeRawUnsafe(
				`UPDATE "catalog_sync"
				 SET "activeSyncId" = $2, "status" = 'ready', "syncedAt" = $3,
				     "itemCount" = $4, "lastError" = NULL, "lockedUntil" = NULL,
				     "lockToken" = NULL, "updatedAt" = $3
				 WHERE "playlistId" = $1 AND "lockToken" = $5
				   AND EXISTS (
				     SELECT 1 FROM "playlist"
				     WHERE "id" = $1 AND ${PLAYLIST_SOURCE_FINGERPRINT_SQL} = $6
				   )`,
				playlistId,
				syncId,
				syncedAt,
				total,
				lockToken,
				fingerprint,
			),
			prisma.$executeRawUnsafe(
				`DELETE FROM "catalog_entry"
				 WHERE "playlistId" = $1 AND "syncId" <> $2
				   AND EXISTS (
				     SELECT 1 FROM "catalog_sync"
				     WHERE "playlistId" = $1 AND "activeSyncId" = $2
				   )`,
				playlistId,
				syncId,
			),
		]);
		if (activated !== 1) {
			throw new CatalogLockLostError();
		}

		console.info("[catalog-index] synced", {
			playlistId,
			rows: total,
			ms: Date.now() - startedAt,
		});
	} catch (error) {
		if (syncId) {
			try {
				await prisma.$executeRawUnsafe(
					`DELETE FROM "catalog_entry" WHERE "playlistId" = $1 AND "syncId" = $2`,
					playlistId,
					syncId,
				);
			} catch {
				// Keep the previous active generation intact.
			}
		}
		if (lockAcquired && error instanceof CatalogLockLostError) {
			// Release the lock if it is still ours (the playlist changed under
			// this sync), so the next search rebuilds right away.
			try {
				await prisma.$executeRawUnsafe(
					`UPDATE "catalog_sync"
					 SET "status" = 'idle', "lockedUntil" = NULL, "lockToken" = NULL,
					     "updatedAt" = CURRENT_TIMESTAMP
					 WHERE "playlistId" = $1 AND "lockToken" = $2`,
					playlistId,
					lockToken,
				);
			} catch {
				// The lock expires on its own.
			}
		} else if (lockAcquired) {
			try {
				await prisma.$executeRawUnsafe(
					`UPDATE "catalog_sync"
					 SET "status" = 'failed', "lastError" = $2, "lockedUntil" = NULL,
					     "lockToken" = NULL, "updatedAt" = CURRENT_TIMESTAMP
					 WHERE "playlistId" = $1 AND "lockToken" = $3`,
					playlistId,
					errorCode(error),
					lockToken,
				);
			} catch {
				// The index remains unavailable or the previous generation stays active.
			}
		}
	}
}

export type EnsureCatalogResult = {
	status: "ready" | "building" | "unavailable";
	stale: boolean;
	syncedAt: Date | null;
	activeSyncId: string | null;
	start: boolean;
	/** Time left before the "Try again" button can start a new sync. */
	retryAfterMs: number;
};

export async function ensureCatalog(
	_userId: string,
	playlistId: string,
	trigger: SyncTrigger = "auto",
): Promise<EnsureCatalogResult> {
	const now = new Date();
	const rows = await prisma.$queryRawUnsafe<CatalogSyncRecord[]>(
		`SELECT "status", "activeSyncId", "syncedAt", "lockedUntil", "lastAttemptAt"
		 FROM "catalog_sync" WHERE "playlistId" = $1 LIMIT 1`,
		playlistId,
	);
	const state = rows[0] ?? null;
	const decision = decideSync(state, now, trigger);
	const lockIsValid =
		state?.status === "syncing" &&
		state.lockedUntil !== null &&
		state.lockedUntil.getTime() > now.getTime();
	const stale =
		Boolean(state?.activeSyncId) &&
		(!state?.syncedAt ||
			now.getTime() - state.syncedAt.getTime() >= CATALOG_TTL_MS);
	const start =
		(decision === "build" || decision === "serve-and-refresh") && !lockIsValid;

	return {
		status:
			decision === "unavailable"
				? "unavailable"
				: decision === "build"
					? "building"
					: "ready",
		stale,
		syncedAt: state?.syncedAt ?? null,
		activeSyncId: state?.activeSyncId ?? null,
		start,
		retryAfterMs: syncRetryDelayMs(state, now, "retry"),
	};
}

export async function searchCatalog(input: {
	playlistId: string;
	activeSyncId: string;
	tokens: readonly string[];
	kinds: readonly CatalogKind[];
	limit: number;
	hidden: Record<CatalogKind, ReadonlySet<string>>;
	adult: Record<CatalogKind, ReadonlySet<string>>;
}): Promise<
	Array<{
		kind: CatalogKind;
		id: string;
		name: string;
		image: string | null;
		categoryId: string;
	}>
> {
	if (input.tokens.length === 0 || input.kinds.length === 0) {
		return [];
	}

	const resultsByKind = await Promise.all(
		input.kinds.map(async (kind) => {
			// Visibility and ranking run in SQL before the LIMIT, so the query
			// only needs the rows it will return. The in-memory pass below
			// re-checks them with the same rules as a safety net.
			const { sql, params } = buildCatalogSearchQuery({
				playlistId: input.playlistId,
				activeSyncId: input.activeSyncId,
				kind,
				tokens: input.tokens,
				hiddenIds: input.hidden[kind],
				adultIds: input.adult[kind],
				limit: Math.min(input.limit, SEARCH_CANDIDATES_PER_KIND),
			});
			const candidates = await prisma.$queryRawUnsafe<CatalogEntryCandidate[]>(
				sql,
				...params,
			);

			const matches = candidates.flatMap((candidate) => {
				const categoryId = pickOpenCategory({
					categoryIds: candidate.categoryIds,
					hiddenIds: input.hidden[kind],
					adultIds: input.adult[kind],
				});
				if (!categoryId) {
					return [];
				}
				const score = rankMatch(candidate.normalizedName, input.tokens);
				if (score === null) {
					return [];
				}
				return [{ ...candidate, categoryId, score }];
			});

			matches.sort(
				(left, right) =>
					left.score - right.score ||
					left.normalizedName.length - right.normalizedName.length ||
					left.normalizedName.localeCompare(right.normalizedName),
			);

			return matches.slice(0, input.limit).map((match) => ({
				kind,
				id: match.itemId,
				name: match.name,
				image: match.image,
				categoryId: match.categoryId,
			}));
		}),
	);

	return resultsByKind.flat();
}

/**
 * Drop the index of a playlist whose source changed. Deleting the sync row
 * also drops the lock token, so a sync still running for the old source
 * cannot activate its rows afterwards. Never throws: a playlist edit must not
 * fail because of the index.
 */
export async function forgetCatalogIndex(playlistId: string): Promise<void> {
	try {
		await prisma.$transaction([
			prisma.$executeRawUnsafe(
				`DELETE FROM "catalog_sync" WHERE "playlistId" = $1`,
				playlistId,
			),
			prisma.$executeRawUnsafe(
				`DELETE FROM "catalog_entry" WHERE "playlistId" = $1`,
				playlistId,
			),
		]);
	} catch (error) {
		console.error(
			"[catalog-index] forget failed",
			error instanceof Error ? error.name : "unknown",
		);
	}
}

/** Never throws, for the same reason as forgetCatalogIndex. */
export async function markCatalogStale(playlistId: string): Promise<void> {
	try {
		await prisma.$executeRawUnsafe(
			`UPDATE "catalog_sync" SET "syncedAt" = $2, "updatedAt" = CURRENT_TIMESTAMP
			 WHERE "playlistId" = $1`,
			playlistId,
			new Date(0),
		);
	} catch (error) {
		console.error(
			"[catalog-index] mark stale failed",
			error instanceof Error ? error.name : "unknown",
		);
	}
}
