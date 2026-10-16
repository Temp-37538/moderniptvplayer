import "server-only";
import prisma from "@moderniptvplayer/db";

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
