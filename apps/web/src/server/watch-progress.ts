import "server-only";
import prisma from "@moderniptvplayer/db";
import {
	continueWatchingEpisodeId,
	formatEpisodeProgressName,
	readPlayableSeasons,
	type EpisodeProgressEntry,
} from "@/lib/series-resume";
import { getCachedShow } from "./cached-content";
import { requireAuthenticatedUserId } from "./auth-utils";

// Past this share of the duration the title counts as watched.
export const COMPLETED_RATIO = 0.92;

export type WatchProgressInput = {
	playlistId: string;
	itemId: string;
	itemType: "movie" | "episode";
	itemName: string;
	itemUrl: string;
	itemImage?: string | null;
	showId?: string | null;
	positionSec: number;
	durationSec: number;
};

const isUniqueViolation = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: unknown }).code === "P2002";

/** Returns false when the playlist does not belong to the user. */
export async function saveWatchProgress(
	userId: string,
	input: WatchProgressInput,
): Promise<boolean> {
	const playlist = await prisma.playlist.findFirst({
		where: { id: input.playlistId, userId },
		select: { id: true },
	});
	if (!playlist) {
		return false;
	}

	const durationSec = Math.floor(input.durationSec);
	const positionSec = Math.min(
		Math.floor(input.positionSec),
		durationSec > 0 ? durationSec : Number.MAX_SAFE_INTEGER,
	);
	const details = {
		itemName: input.itemName,
		itemUrl: input.itemUrl,
		itemImage: input.itemImage ?? null,
		showId: input.showId ?? null,
		positionSec,
		durationSec,
		completed: durationSec > 0 && positionSec >= durationSec * COMPLETED_RATIO,
	};
	const where = {
		playlistId_itemId_itemType: {
			playlistId: input.playlistId,
			itemId: input.itemId,
			itemType: input.itemType,
		},
	};
	const save = () =>
		prisma.watchProgress.upsert({
			where,
			create: {
				...details,
				itemId: input.itemId,
				itemType: input.itemType,
				playlistId: input.playlistId,
				userId,
			},
			update: details,
		});

	try {
		await save();
	} catch (error) {
		// Two saves racing on a new row: the second one is now an update.
		if (!isUniqueViolation(error)) {
			throw error;
		}
		await save();
	}
	return true;
}

export type ResumeInfo = {
	positionSec: number;
	durationSec: number;
	completed: boolean;
};

const resumeSelect = {
	positionSec: true,
	durationSec: true,
	completed: true,
} as const;

export async function getResumeInfo(
	playlistId: string,
	itemId: string,
	itemType: "movie" | "episode",
): Promise<ResumeInfo | null> {
	const userId = await requireAuthenticatedUserId();
	return prisma.watchProgress.findFirst({
		where: { playlistId, itemId, itemType, userId },
		select: resumeSelect,
	});
}

/** Progress of every episode of a show, by episode id. */
export async function getEpisodeProgress(
	playlistId: string,
	showId: string,
): Promise<Record<string, EpisodeProgressEntry>> {
	const userId = await requireAuthenticatedUserId();
	const rows = await prisma.watchProgress.findMany({
		where: { playlistId, showId, itemType: "episode", userId },
		select: { itemId: true, ...resumeSelect, updatedAt: true },
	});
	return Object.fromEntries(
		rows.map(({ itemId, updatedAt, ...info }) => [
			itemId,
			{ ...info, updatedAt: updatedAt.getTime() },
		]),
	);
}

export type ManualEpisodeProgress = {
	id: string;
	name: string;
	durationSec: number;
};

/**
 * Sets watched or unwatched on already known episodes of one show.
 * The caller has checked that each id belongs to that show.
 *
 * `updatedAt` is staggered on purpose. Marking watched makes the last episode
 * the newest, so Continue Watching can move to whatever follows it. Marking
 * unwatched makes the first episode the newest, so that is the one to resume.
 * The preferred episode is also written last, in case the database stamps
 * `updatedAt` itself.
 */
export async function saveManualEpisodeProgress(
	userId: string,
	input: {
		playlistId: string;
		showId: string;
		categoryId: string;
		showImage: string | null;
		episodes: ManualEpisodeProgress[];
		watched: boolean;
	},
): Promise<void> {
	if (input.episodes.length === 0) {
		return;
	}

	const playlist = await prisma.playlist.findFirst({
		where: { id: input.playlistId, userId },
		select: { id: true },
	});
	if (!playlist) {
		throw new Error("Playlist not found");
	}

	const existing = await prisma.watchProgress.findMany({
		where: {
			userId,
			playlistId: input.playlistId,
			itemType: "episode",
			itemId: { in: input.episodes.map((episode) => episode.id) },
		},
		select: { itemId: true, durationSec: true },
	});
	const durationById = new Map(
		existing.map((row) => [row.itemId, row.durationSec]),
	);
	const now = Date.now();
	const count = input.episodes.length;
	const stamped = input.episodes.map((episode, index) => {
		const known = durationById.get(episode.id) ?? 0;
		const catalog = Math.max(0, Math.floor(episode.durationSec));
		const durationSec = known > 0 ? known : catalog;
		const age = input.watched ? count - 1 - index : index;
		return {
			episode,
			durationSec,
			positionSec: input.watched && durationSec > 0 ? durationSec : 0,
			updatedAt: new Date(now - age),
		};
	});
	const writeOrder = input.watched ? stamped : [...stamped].reverse();
	const writeAll = () =>
		prisma.$transaction(
			writeOrder.map((entry) => {
				const details = {
					itemName: entry.episode.name.slice(0, 300),
					itemUrl: seriesEpisodeItemUrl(
						input.playlistId,
						input.categoryId,
						input.showId,
						entry.episode.id,
					),
					itemImage: input.showImage,
					showId: input.showId,
					positionSec: entry.positionSec,
					durationSec: entry.durationSec,
					completed: input.watched,
					updatedAt: entry.updatedAt,
					userId,
				};
				return prisma.watchProgress.upsert({
					where: {
						playlistId_itemId_itemType: {
							playlistId: input.playlistId,
							itemId: entry.episode.id,
							itemType: "episode",
						},
					},
					create: {
						...details,
						itemId: entry.episode.id,
						itemType: "episode",
						playlistId: input.playlistId,
					},
					update: details,
				});
			}),
		);

	try {
		await writeAll();
	} catch (error) {
		if (!isUniqueViolation(error)) {
			throw error;
		}
		await writeAll();
	}
}

export type ContinueWatchingItem = {
	id: string;
	itemName: string;
	itemUrl: string;
	itemImage: string | null;
	positionSec: number;
	durationSec: number;
};

const SERIES_ITEM_PATH =
	/^\/dashboard\/series\/([^/]+)\/([^/]+)\/([^/#]+)(?:#.*)?$/;

function decodeSegment(value: string): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
}

function isSafePathSegment(value: string): boolean {
	if (value.length < 1 || value.length > 128) {
		return false;
	}
	if (
		value.includes("/") ||
		value.includes("\\") ||
		value.includes("..") ||
		value.includes("#") ||
		value.includes("?") ||
		value.includes("%")
	) {
		return false;
	}
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code < 32 || code === 127) {
			return false;
		}
	}
	return true;
}

export function seriesEpisodeItemUrl(
	playlistId: string,
	categoryId: string,
	showId: string,
	episodeId: string,
): string {
	return `/dashboard/series/${playlistId}/${categoryId}/${showId}#episode-${encodeURIComponent(episodeId)}`;
}

function categoryIdFromItemUrl(
	itemUrl: string,
	playlistId: string,
	showId: string,
): string | null {
	const match = SERIES_ITEM_PATH.exec(itemUrl);
	if (!match) {
		return null;
	}
	const playlist = decodeSegment(match[1] ?? "");
	const category = decodeSegment(match[2] ?? "");
	const show = decodeSegment(match[3] ?? "");
	if (!playlist || !category || !show) {
		return null;
	}
	if (playlist !== playlistId || show !== showId) {
		return null;
	}
	return isSafePathSegment(category) ? category : null;
}

function firstSafeCategory(categoryIds: unknown): string | null {
	if (!Array.isArray(categoryIds)) {
		return null;
	}
	for (const value of categoryIds) {
		if (typeof value === "string" && isSafePathSegment(value)) {
			return value;
		}
	}
	return null;
}

function httpPoster(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	if (!/^https?:\/\//i.test(trimmed) || trimmed.length > 2048) {
		return null;
	}
	return trimmed;
}

function reuseSeriesPath(
	itemUrl: string,
	playlistId: string,
	showId: string,
	episodeId: string,
): string | null {
	const path = itemUrl.split("#")[0] ?? "";
	if (
		!path.startsWith("/dashboard/series/") ||
		path.includes("..") ||
		path.includes("//") ||
		episodeId.length < 1 ||
		episodeId.length > 1024
	) {
		return null;
	}
	const match = SERIES_ITEM_PATH.exec(path);
	if (!match) {
		return null;
	}
	const playlist = decodeSegment(match[1] ?? "");
	const show = decodeSegment(match[3] ?? "");
	if (playlist !== playlistId || show !== showId) {
		return null;
	}
	return `${path}#episode-${encodeURIComponent(episodeId)}`;
}

function nextEpisodeUrl(
	itemUrl: string,
	playlistId: string,
	showId: string,
	episodeId: string,
	categoryIds: unknown,
): string | null {
	const reused = reuseSeriesPath(itemUrl, playlistId, showId, episodeId);
	if (reused) {
		return reused;
	}
	const category =
		categoryIdFromItemUrl(itemUrl, playlistId, showId) ??
		firstSafeCategory(categoryIds);
	if (
		!category ||
		!isSafePathSegment(playlistId) ||
		!isSafePathSegment(showId) ||
		episodeId.length < 1 ||
		episodeId.length > 1024
	) {
		return null;
	}
	return seriesEpisodeItemUrl(playlistId, category, showId, episodeId);
}

function toContinueItem(row: {
	id: string;
	itemName: string;
	itemUrl: string;
	itemImage: string | null;
	positionSec: number;
	durationSec: number;
}): ContinueWatchingItem {
	return {
		id: row.id,
		itemName: row.itemName,
		itemUrl: row.itemUrl,
		itemImage: row.itemImage,
		positionSec: row.positionSec,
		durationSec: row.durationSec,
	};
}

/**
 * One shelf entry for a show. The most recently watched episode decides, using
 * the same order as the series page. A finished episode yields the next one
 * that is not already completed. When none exists, the show is left out.
 */
async function resolveShow(row: {
	id: string;
	playlistId: string;
	showId: string | null;
	itemId: string;
	itemName: string;
	itemUrl: string;
	itemImage: string | null;
	positionSec: number;
	durationSec: number;
	completed: boolean;
}): Promise<ContinueWatchingItem | null> {
	if (!row.showId) {
		return null;
	}
	let show: Awaited<ReturnType<typeof getCachedShow>> | null;
	try {
		show = await getCachedShow(row.playlistId, undefined, row.showId);
	} catch {
		// An unfinished episode can still be opened from the row we stored.
		// A finished one has no next episode unless the catalog says so.
		return row.completed ? null : toContinueItem(row);
	}
	if (!show) {
		return row.completed ? null : toContinueItem(row);
	}

	const playable = readPlayableSeasons(show);
	const showRecord = show as {
		name?: unknown;
		poster?: unknown;
		categoryIds?: unknown;
	};
	const progress = await getEpisodeProgress(row.playlistId, row.showId);
	const episodeId = continueWatchingEpisodeId(
		playable.map((episode) => episode.id),
		progress,
	);
	if (!episodeId) {
		return row.completed ? null : toContinueItem(row);
	}
	if (episodeId === row.itemId) {
		const fresh = progress[episodeId];
		if (!fresh || fresh.completed) {
			return null;
		}
		return toContinueItem({
			...row,
			positionSec: fresh.positionSec,
			durationSec: fresh.durationSec,
		});
	}

	const episode = playable.find((item) => item.id === episodeId);
	if (!episode) {
		return null;
	}
	const itemUrl = nextEpisodeUrl(
		row.itemUrl,
		row.playlistId,
		row.showId,
		episodeId,
		showRecord.categoryIds,
	);
	if (!itemUrl) {
		return null;
	}
	const entry = progress[episodeId];
	const showName = typeof showRecord.name === "string" ? showRecord.name : "";
	return {
		id: `next:${row.playlistId}:${row.showId}:${episodeId}`,
		itemName: formatEpisodeProgressName(
			showName,
			episode.seasonName,
			episode.number,
		),
		itemUrl,
		itemImage: row.itemImage ?? httpPoster(showRecord.poster),
		positionSec: entry && !entry.completed ? entry.positionSec : 0,
		durationSec:
			entry && entry.durationSec > 0 ? entry.durationSec : episode.durationSec,
	};
}

/** Unfinished titles, latest first. A show appears once. */
export async function getContinueWatching(
	limit = 12,
): Promise<ContinueWatchingItem[]> {
	const userId = await requireAuthenticatedUserId();
	const rows = await prisma.watchProgress.findMany({
		where: { userId },
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: limit * 4,
	});

	const seenShows = new Set<string>();
	const items: ContinueWatchingItem[] = [];
	for (const row of rows) {
		if (items.length >= limit) {
			break;
		}
		// Movies (and anything that is not a series) stay on this row.
		if (!row.showId) {
			if (!row.completed) {
				items.push(toContinueItem(row));
			}
			continue;
		}
		const key = `${row.playlistId}:${row.showId}`;
		if (seenShows.has(key)) {
			continue;
		}
		seenShows.add(key);
		// Still in progress: the stored row is the episode to resume. The
		// provider is consulted only once that episode is finished.
		if (!row.completed) {
			items.push(toContinueItem(row));
			continue;
		}
		const next = await resolveShow(row);
		if (next) {
			items.push(next);
		}
	}
	return items;
}
