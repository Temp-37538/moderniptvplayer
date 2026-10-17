import "server-only";
import prisma from "@moderniptvplayer/db";
import type { EpisodeProgressEntry } from "@/lib/series-resume";
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

/** Unfinished titles, latest first; a show appears once (its latest episode). */
export async function getContinueWatching(limit = 12) {
	const userId = await requireAuthenticatedUserId();
	const rows = await prisma.watchProgress.findMany({
		where: { userId },
		orderBy: { updatedAt: "desc" },
		take: limit * 4,
	});

	const seenShows = new Set<string>();
	const items: typeof rows = [];
	for (const row of rows) {
		if (row.showId) {
			const key = `${row.playlistId}:${row.showId}`;
			if (seenShows.has(key)) {
				continue;
			}
			seenShows.add(key);
		}
		// Judged on the latest episode only: a finished one hides the show.
		if (!row.completed) {
			items.push(row);
		}
		if (items.length === limit) {
			break;
		}
	}
	return items;
}
