"use server";
import prisma from "@moderniptvplayer/db";
import type { ItemType, UserItemStatus } from "@/components/types";
import { requireAuthenticatedUserId } from "./auth-utils";
import { revalidatePath } from "next/cache";

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
	playlistId: string,
	itemId: string,
	itemType: ItemType,
	itemName: string,
	itemUrl: string,
): Promise<boolean> {
	const playlist = await verifyPlaylistOwnership(playlistId);

	const where = {
		playlistId_itemId_itemType: { playlistId, itemId, itemType },
	} as const;

	const data = {
		itemId,
		itemType,
		itemName,
		itemUrl,
		playlistId,
		userId: playlist.userId,
	};

	const existing =
		model === "watchLater"
			? await prisma.watchLater.findUnique({ where })
			: await prisma.favorite.findUnique({ where });

	if (existing) {
		if (model === "watchLater") {
			await prisma.watchLater.delete({ where: { id: existing.id } });
		} else {
			await prisma.favorite.delete({ where: { id: existing.id } });
		}
		revalidatePath("/dashboard", "layout");
		return false;
	}

	if (model === "watchLater") {
		await prisma.watchLater.create({ data });
	} else {
		await prisma.favorite.create({ data });
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
	return toggleItem(
		"watchLater",
		playlistId,
		itemId,
		itemType,
		itemName,
		itemUrl,
	);
}

export async function toggleFavorite(
	playlistId: string,
	itemId: string,
	itemType: ItemType,
	itemName: string,
	itemUrl: string,
): Promise<boolean> {
	return toggleItem(
		"favorite",
		playlistId,
		itemId,
		itemType,
		itemName,
		itemUrl,
	);
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
