"use server";

import prisma from "@moderniptvplayer/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedUserId } from "./auth-utils";
import { isValidCategoryId } from "./category-preference-policy";

const preferenceSchema = z.object({
	playlistId: z.string().min(1).max(64),
	kind: z.enum(["channel", "movie", "series"]),
	categoryId: z.string().refine(isValidCategoryId),
});

const isUniqueViolation = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: unknown }).code === "P2002";

async function ownedPlaylist(playlistId: string, userId: string) {
	const playlist = await prisma.playlist.findFirst({
		where: { id: playlistId, userId },
		select: { id: true },
	});
	if (!playlist) {
		throw new Error("Playlist not found or access denied");
	}
	return playlist;
}

async function toggleFlag(
	input: {
		playlistId: string;
		kind: "channel" | "movie" | "series";
		categoryId: string;
	},
	flag: "pinned" | "hidden",
) {
	const parsed = preferenceSchema.safeParse(input);
	if (!parsed.success) {
		throw new Error("Invalid category");
	}
	const userId = await requireAuthenticatedUserId();
	const { playlistId, kind, categoryId } = parsed.data;
	await ownedPlaylist(playlistId, userId);

	const where = { userId, playlistId, kind, categoryId };
	const existing = await prisma.categoryPreference.findFirst({ where });
	const pinned =
		flag === "pinned" ? !existing?.pinned : Boolean(existing?.pinned);
	const hidden =
		flag === "hidden" ? !existing?.hidden : Boolean(existing?.hidden);

	if (!pinned && !hidden) {
		if (existing) {
			await prisma.categoryPreference.deleteMany({ where });
		}
		revalidatePath("/dashboard", "layout");
		return false;
	}

	if (existing) {
		await prisma.categoryPreference.update({
			where: { id: existing.id },
			data: { pinned, hidden },
		});
	} else {
		try {
			await prisma.categoryPreference.create({
				data: { ...where, pinned, hidden },
			});
		} catch (error) {
			if (!isUniqueViolation(error)) {
				throw error;
			}
			await prisma.categoryPreference.updateMany({
				where,
				data: { pinned, hidden },
			});
		}
	}

	revalidatePath("/dashboard", "layout");
	return flag === "pinned" ? pinned : hidden;
}

export async function toggleCategoryPin(
	playlistId: string,
	kind: "channel" | "movie" | "series",
	categoryId: string,
) {
	return toggleFlag({ playlistId, kind, categoryId }, "pinned");
}

export async function toggleCategoryHidden(
	playlistId: string,
	kind: "channel" | "movie" | "series",
	categoryId: string,
) {
	return toggleFlag({ playlistId, kind, categoryId }, "hidden");
}

export async function setAdultCategoryLock(locked: boolean) {
	if (typeof locked !== "boolean") {
		throw new Error("Invalid preference");
	}
	const userId = await requireAuthenticatedUserId();
	await prisma.userSafetyPreference.upsert({
		where: { userId },
		create: { userId, lockAdultCategories: locked },
		update: { lockAdultCategories: locked },
	});
	revalidatePath("/dashboard", "layout");
}
