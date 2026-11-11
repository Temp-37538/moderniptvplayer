"use server";

import { requireAuthenticatedUserId } from "@/server/auth-utils";
import { removeContinueWatchingEntry } from "@/server/watch-progress";
import { getPlaylistStatus } from "@/server/xtream";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getPlaylistStatusAction(playlistId: string) {
	if (!playlistId) {
		return null;
	}

	try {
		return await getPlaylistStatus(playlistId);
	} catch {
		return null;
	}
}

const continueWatchingEntrySchema = z.object({
	id: z.string().min(1).max(2048),
	playlistId: z.string().min(1).max(256),
	showId: z.string().min(1).max(1024).nullable(),
});

/** Removes one title from the home page Continue Watching rail. */
export async function removeContinueWatchingAction(entry: {
	id: string;
	playlistId: string;
	showId: string | null;
}) {
	const userId = await requireAuthenticatedUserId();
	const parsed = continueWatchingEntrySchema.safeParse(entry);
	if (!parsed.success) {
		throw new Error("Invalid entry");
	}
	await removeContinueWatchingEntry(userId, parsed.data);
	revalidatePath("/dashboard");
}
