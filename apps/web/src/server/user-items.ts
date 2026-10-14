"use server";
import prisma from "@moderniptvplayer/db";
import { z } from "zod";
import type { ItemType, UserItemStatus } from "@/components/types";
import { requireAuthenticatedUserId } from "./auth-utils";
import { revalidatePath } from "next/cache";

// Server actions receive whatever a client sends: validate before storing.
// `itemUrl` is rendered as a link, so it must be an in-app path.
function isInternalAppPath(value: string) {
	if (!value.startsWith("/dashboard/") || value.includes("//")) {
		return false;
	}
	if (value.includes("\\") || value.split("/").includes("..")) {
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

const toggleInputSchema = z.object({
	playlistId: z.string().min(1).max(64),
	itemId: z.string().min(1).max(128),
	itemType: z.enum(["channel", "movie", "series"]),
	itemName: z.string().max(300),
	itemUrl: z.string().max(512).refine(isInternalAppPath),
});

const isUniqueViolation = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: unknown }).code === "P2002";

async function verifyPlaylistOwnership(playlistId: string) {
	const userId = await requireAuthenticatedUserId();

	const playlist = await prisma.playlist.findFirst({
		where: {
			id: playlistId,
			userId,
		},
	});

	if (!playlist) {
		throw new Error("Playlist not found or access denied");
	}

	return playlist;
}

export async function getItemStatus(
	playlistId: string,
	itemId: string,
	itemType: ItemType,
): Promise<UserItemStatus> {
	await verifyPlaylistOwnership(playlistId);

	const [watchLater, favorite] = await Promise.all([
		prisma.watchLater.findUnique({
			where: {
				playlistId_itemId_itemType: {
					playlistId,
					itemId,
					itemType,
				},
			},
		}),
		prisma.favorite.findUnique({
			where: {
				playlistId_itemId_itemType: {
					playlistId,
					itemId,
					itemType,
				},
			},
		}),
	]);

	return {
		isWatchLater: !!watchLater,
		isFavorite: !!favorite,
	};
}

type ToggleableModel = "watchLater" | "favorite";

async function toggleItem(
	model: ToggleableModel,
	input: {
		playlistId: string;
		itemId: string;
		itemType: ItemType;
		itemName: string;
		itemUrl: string;
	},
): Promise<boolean> {
	const parsed = toggleInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new Error("Invalid item");
	}
	const { playlistId, itemId, itemType, itemName, itemUrl } = parsed.data;

	const playlist = await verifyPlaylistOwnership(playlistId);

	const where = { playlistId, itemId, itemType };

	// Delete first: when a row existed this is the toggle-off, and there is no
	// read-then-write window for two concurrent clicks to race on.
	const removed =
		model === "watchLater"
			? await prisma.watchLater.deleteMany({ where })
			: await prisma.favorite.deleteMany({ where });

	if (removed.count > 0) {
		revalidatePath("/dashboard", "layout");
		return false;
	}

	const data = {
		itemId,
		itemType,
		itemName,
		itemUrl,
		playlistId,
		userId: playlist.userId,
	};

	try {
		if (model === "watchLater") {
			await prisma.watchLater.create({ data });
		} else {
			await prisma.favorite.create({ data });
		}
	} catch (error) {
		// A concurrent request created the same row: the item is saved.
		if (!isUniqueViolation(error)) {
			throw error;
		}
	}

	revalidatePath("/dashboard", "layout");
	return true;
}

export async function toggleWatchLater(
	playlistId: string,
	itemId: string,
	itemType: ItemType,
	itemName: string,
	itemUrl: string,
): Promise<boolean> {
	return toggleItem("watchLater", {
		playlistId,
		itemId,
		itemType,
		itemName,
		itemUrl,
	});
}

export async function toggleFavorite(
	playlistId: string,
	itemId: string,
	itemType: ItemType,
	itemName: string,
	itemUrl: string,
): Promise<boolean> {
	return toggleItem("favorite", {
		playlistId,
		itemId,
		itemType,
		itemName,
		itemUrl,
	});
}

export async function getWatchLaterItems(playlistId: string) {
	await verifyPlaylistOwnership(playlistId);

	return prisma.watchLater.findMany({
		where: { playlistId },
		orderBy: { createdAt: "desc" },
	});
}

export async function getFavoriteItems(playlistId: string) {
	await verifyPlaylistOwnership(playlistId);

	return prisma.favorite.findMany({
		where: { playlistId },
		orderBy: { createdAt: "desc" },
	});
}
