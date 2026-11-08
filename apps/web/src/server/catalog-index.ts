import "server-only";
import prisma from "@moderniptvplayer/db";
import {
	CATALOG_INSERT_BATCH,
	CATALOG_KINDS,
	CATALOG_MAX_ROWS,
	CATALOG_TTL_MS,
	SEARCH_CANDIDATES_PER_KIND,
	SYNC_LOCK_MS,
	SYNC_RETRY_COOLDOWN_MS,
	decideSync,
	pickOpenCategory,
	rankMatch,
	toCatalogRows,
	type CatalogKind,
	type CatalogRowInput,
	type CatalogSyncPolicyState,
} from "./catalog-index-policy";
import { readM3uCatalog } from "./m3u-catalog";
import { createXtreamClient, getCachedPlaylistByUserAndId } from "./xtream";

type CatalogSyncRecord = CatalogSyncPolicyState;

type CatalogEntryCandidate = {
	itemId: string;
	name: string;
	normalizedName: string;
	categoryIds: string[];
	image: string | null;
};

type CatalogEntryCreate = CatalogRowInput & {
	playlistId: string;
	syncId: string;
};

type CatalogPrisma = {
	catalogSync: {
		upsert(args: {
			where: { playlistId: string };
			create: { playlistId: string };
			update: Record<string, never>;
		}): Promise<unknown>;
		updateMany(args: {
			where: {
				playlistId: string;
				OR?: Array<
					| { status: { not: string } }
					| { lockedUntil: { lt: Date } }
				>;
			};
			data: {
				status?: string;
				lockedUntil?: Date | null;
				lastAttemptAt?: Date;
				activeSyncId?: string | null;
				syncedAt?: Date | null;
				itemCount?: number;
				lastError?: string | null;
			};
		}): Promise<{ count: number }>;
		findUnique(args: {
			where: { playlistId: string };
		}): Promise<CatalogSyncRecord | null>;
		update(args: {
			where: { playlistId: string };
			data: {
				activeSyncId?: string | null;
				status?: string;
				syncedAt?: Date | null;
				itemCount?: number;
				lastError?: string | null;
				lockedUntil?: Date | null;
			};
		}): Promise<unknown>;
		deleteMany(args: {
			where: { playlistId: string };
		}): Promise<unknown>;
	};
	catalogEntry: {
		createMany(args: {
			data: CatalogEntryCreate[];
			skipDuplicates: boolean;
		}): Promise<{ count: number }>;
		deleteMany(args: {
			where: { playlistId: string; syncId?: { not: string } };
		}): Promise<unknown>;
		findMany(args: {
			where: {
				playlistId: string;
				syncId: string;
				kind: CatalogKind;
				AND: Array<{ normalizedName: { contains: string } }>;
			};
			select: {
				itemId: true;
				name: true;
				normalizedName: true;
				categoryIds: true;
				image: true;
			};
			orderBy: { normalizedName: "asc" };
			take: number;
		}): Promise<CatalogEntryCandidate[]>;
	};
	$transaction(operations: Promise<unknown>[]): Promise<unknown[]>;
};

// The catalogue tables are introduced by the preceding schema migration PR.
// Keep the generated Prisma client boundary local until that schema is deployed.
const catalogPrisma = prisma as unknown as CatalogPrisma;

class CatalogTooLargeError extends Error {}
class CatalogSyncTimeoutError extends Error {}

const SYNC_TIMEOUT_MS = 50_000;

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new CatalogSyncTimeoutError()),
			timeoutMs,
		);
		work.then(
			(value) => {
				clearTimeout(timeout);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timeout);
				reject(error);
			},
		);
	});
}

function errorCode(error: unknown, collecting: boolean): string {
	if (error instanceof CatalogTooLargeError) {
		return "too_large";
	}
	if (error instanceof CatalogSyncTimeoutError) {
		return "timeout";
	}
	return collecting ? "provider" : "unknown";
}

async function collectCatalogRows(
	playlist: Awaited<ReturnType<typeof getCachedPlaylistByUserAndId>> & {},
): Promise<CatalogRowInput[]> {
	if (playlist.source === "M3U") {
		const parsed = await readM3uCatalog(playlist);
		return [
			...toCatalogRows("channel", parsed.live),
			...toCatalogRows("movie", parsed.movies),
			...toCatalogRows("series", parsed.shows),
		];
	}

	const xtream = createXtreamClient(playlist);
	const [channels, movies, shows] = await Promise.all([
		xtream.getChannels(),
		xtream.getMovies(),
		xtream.getShows(),
	]);
	return [
		...toCatalogRows("channel", channels),
		...toCatalogRows("movie", movies),
		...toCatalogRows("series", shows),
	];
}

export async function syncCatalog(
	userId: string,
	playlistId: string,
): Promise<void> {
	const startedAt = Date.now();
	let syncId: string | null = null;
	let lockAcquired = false;
	let collecting = true;
	let total = 0;

	try {
		await catalogPrisma.catalogSync.upsert({
			where: { playlistId },
			create: { playlistId },
			update: {},
		});

		const now = new Date();
		const lock = await catalogPrisma.catalogSync.updateMany({
			where: {
				playlistId,
				OR: [
					{ status: { not: "syncing" } },
					{ lockedUntil: { lt: now } },
				],
			},
			data: {
				status: "syncing",
				lockedUntil: new Date(now.getTime() + SYNC_LOCK_MS),
				lastAttemptAt: now,
			},
		});
		if (lock.count !== 1) {
			return;
		}
		lockAcquired = true;

		const playlist = await getCachedPlaylistByUserAndId(userId, playlistId);
		if (!playlist) {
			await catalogPrisma.catalogSync.update({
				where: { playlistId },
				data: { status: "idle", lockedUntil: null, lastError: null },
			});
			return;
		}

		const rows = await withTimeout(
			collectCatalogRows(playlist),
			SYNC_TIMEOUT_MS,
		);
		total = rows.length;
		if (total > CATALOG_MAX_ROWS) {
			throw new CatalogTooLargeError();
		}

		syncId = crypto.randomUUID();
		collecting = false;
		for (let offset = 0; offset < rows.length; offset += CATALOG_INSERT_BATCH) {
			const batch = rows.slice(offset, offset + CATALOG_INSERT_BATCH);
			await catalogPrisma.catalogEntry.createMany({
				data: batch.map((row) => ({ ...row, playlistId, syncId: syncId as string })),
				skipDuplicates: true,
			});
		}

		await catalogPrisma.$transaction([
			catalogPrisma.catalogSync.update({
				where: { playlistId },
				data: {
					activeSyncId: syncId,
					status: "ready",
					syncedAt: new Date(),
					itemCount: total,
					lastError: null,
					lockedUntil: null,
				},
			}),
			catalogPrisma.catalogEntry.deleteMany({
				where: { playlistId, syncId: { not: syncId } },
			}),
		]);

		console.info("[catalog-index] synced", {
			playlistId,
			rows: total,
			ms: Date.now() - startedAt,
		});
	} catch (error) {
		if (syncId) {
			try {
				await catalogPrisma.catalogEntry.deleteMany({
					where: { playlistId, syncId },
				});
			} catch {
				// Keep the previous active generation intact.
			}
		}
		if (lockAcquired) {
			try {
				await catalogPrisma.catalogSync.update({
					where: { playlistId },
					data: {
						status: "failed",
						lastError: errorCode(error, collecting),
						lockedUntil: null,
					},
				});
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
};

export async function ensureCatalog(
	_userId: string,
	playlistId: string,
): Promise<EnsureCatalogResult> {
	const now = new Date();
	const state = await catalogPrisma.catalogSync.findUnique({
		where: { playlistId },
	});
	const decision = decideSync(state, now);
	const lockIsValid =
		state?.status === "syncing" &&
		state.lockedUntil !== null &&
		state.lockedUntil.getTime() > now.getTime();
	const stale =
		Boolean(state?.activeSyncId) &&
		(!state?.syncedAt ||
			now.getTime() - state.syncedAt.getTime() >= CATALOG_TTL_MS);
	const start =
		(decision === "build" || decision === "serve-and-refresh") &&
		!lockIsValid;

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
	const resultsByKind = await Promise.all(
		input.kinds.map(async (kind) => {
			const candidates = await catalogPrisma.catalogEntry.findMany({
				where: {
					playlistId: input.playlistId,
					syncId: input.activeSyncId,
					kind,
					AND: input.tokens.map((token) => ({
						normalizedName: { contains: token },
					})),
				},
				select: {
					itemId: true,
					name: true,
					normalizedName: true,
					categoryIds: true,
					image: true,
				},
				orderBy: { normalizedName: "asc" },
				take: SEARCH_CANDIDATES_PER_KIND,
			});

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

export async function forgetCatalogIndex(playlistId: string): Promise<void> {
	await catalogPrisma.catalogEntry.deleteMany({ where: { playlistId } });
	await catalogPrisma.catalogSync.deleteMany({ where: { playlistId } });
}

export async function markCatalogStale(playlistId: string): Promise<void> {
	await catalogPrisma.catalogSync.updateMany({
		where: { playlistId },
		data: { syncedAt: new Date(0) },
	});
}
