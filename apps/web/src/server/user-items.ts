"use server";

import "server-only";
import prisma from "../../../../packages/db/src/index";
import type { ItemType, UserItemStatus } from "@/components/types";
import { getAuthenticatedUserId } from "./auth-utils";
import { revalidatePath } from "next/cache";

async function verifyPlaylistOwnership(playlistId: string) {
	const userId = await getAuthenticatedUserId();

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

export async function toggleWatchLater(
	playlistId: string,
	itemId: string,
	itemType: ItemType,
	itemName: string,
	itemUrl: string,
): Promise<boolean> {
	const playlist = await verifyPlaylistOwnership(playlistId);

	const existing = await prisma.watchLater.findUnique({
		where: {
			playlistId_itemId_itemType: {
				playlistId,
				itemId,
				itemType,
			},
		},
	});

	if (existing) {
		await prisma.watchLater.delete({
			where: { id: existing.id },
		});
		revalidatePath("/dashboard", "layout");
		return false;
	}

	await prisma.watchLater.create({
		data: {
			itemId,
			itemType,
			itemName,
			itemUrl,
			playlistId,
			userId: playlist.userId,
		},
	});
	revalidatePath("/dashboard", "layout");
	return true;
}

export async function toggleFavorite(
	playlistId: string,
	itemId: string,
	itemType: ItemType,
	itemName: string,
	itemUrl: string,
): Promise<boolean> {
	const playlist = await verifyPlaylistOwnership(playlistId);

	const existing = await prisma.favorite.findUnique({
		where: {
			playlistId_itemId_itemType: {
				playlistId,
				itemId,
				itemType,
			},
		},
	});

	if (existing) {
		await prisma.favorite.delete({
			where: { id: existing.id },
		});
		revalidatePath("/dashboard", "layout");
		return false;
	}

	await prisma.favorite.create({
		data: {
			itemId,
			itemType,
			itemName,
			itemUrl,
			playlistId,
			userId: playlist.userId,
		},
	});
	revalidatePath("/dashboard", "layout");
	return true;
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
