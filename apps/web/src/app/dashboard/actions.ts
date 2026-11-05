"use server";

import { getPlaylistStatus } from "@/server/xtream";

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
