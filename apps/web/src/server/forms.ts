"use server";
import type { FormState, xtreamFormData } from "@/components/types";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getPlaylistCacheTags } from "./cached-content";
import {
	addPlaylist,
	deletePlaylist,
	doesPlaylistExist,
	isPlaylistValid,
} from "./queries";
import { getPlaylistById } from "./xtream";

export async function validate(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const xtreamCodesSchema = z.object({
		username: z.string().min(1, "Username is required"),
		password: z.string().min(1, "Password is required"),
		serverUrl: z.url("Please enter a valid URL"),
		playlistName: z.string().min(1, "Playlist name is required"),
	});

	const rawData: xtreamFormData = {
		username: formData.get("username") as string,
		password: formData.get("password") as string,
		playlistName: formData.get("playlistName") as string,
		serverUrl: formData.get("serverUrl") as string,
	};

	const validatedData = xtreamCodesSchema.safeParse(rawData);

	if (!validatedData.success) {
		const { properties } = z.treeifyError(validatedData.error);
		return {
			errors: { properties },
			success: false,
			inputs: rawData,
			message: "Please fix the errors above.",
		};
	}

	const alreadyExists = await doesPlaylistExist(
		validatedData.data.username,
		validatedData.data.serverUrl,
		validatedData.data.password,
	);

	if (alreadyExists) {
		return {
			errors: {
				properties: {
					serverUrl: { errors: ["Playlist already exists"] },
					password: { errors: ["Playlist already exists"] },
					username: { errors: ["Playlist already exists"] },
				},
			},
			success: false,
			inputs: rawData,
			message: "You have already added this playlist.",
		};
	}

	const valid = await isPlaylistValid(
		validatedData.data.username,
		validatedData.data.serverUrl,
		validatedData.data.password,
	);

	if (valid.error === "network") {
		return {
			errors: {
				properties: {
					serverUrl: {
						errors: [
							"Unable to reach the playlist server. Check the URL or DNS.",
						],
					},
				},
			},
			success: false,
			inputs: rawData,
			message: "Playlist server is unreachable.",
		};
	}

	if (!valid.ok) {
		return {
			errors: {
				properties: {
					serverUrl: { errors: ["Invalid playlist credentials"] },
					password: { errors: ["Invalid playlist credentials"] },
					username: { errors: ["Invalid playlist credentials"] },
				},
			},
			success: false,
			inputs: rawData,
			message: "Invalid playlist.",
		};
	}

	await addPlaylist(
		validatedData.data.username,
		validatedData.data.serverUrl,
		validatedData.data.playlistName,
		validatedData.data.password,
	);

	return {
		errors: {},
		success: true,
		inputs: validatedData.data,
		message: "Playlist added successfully !",
	};
}

async function assertPlaylistAccess(playlistId: string) {
	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		throw new Error("Playlist not found");
	}
}

function expirePlaylistCacheTags(playlistId: string) {
	for (const tag of getPlaylistCacheTags(playlistId)) {
		updateTag(tag);
	}
}

export async function deletePlaylistAction(playlistId: string) {
	await assertPlaylistAccess(playlistId);
	expirePlaylistCacheTags(playlistId);
	await deletePlaylist(playlistId);
}

export async function refreshPlaylistCacheAction(playlistId: string) {
	await assertPlaylistAccess(playlistId);
	expirePlaylistCacheTags(playlistId);
}

export async function preparePlaylistSwitchAction(
	previousPlaylistId: string | null | undefined,
	nextPlaylistId: string | null | undefined,
) {
	const cookieStore = await cookies();

	const playlistIds = [previousPlaylistId, nextPlaylistId].filter(
		(playlistId, index, ids): playlistId is string =>
			Boolean(playlistId) && ids.indexOf(playlistId) === index,
	);

	for (const playlistId of playlistIds) {
		await assertPlaylistAccess(playlistId);
		expirePlaylistCacheTags(playlistId);
	}

	if (nextPlaylistId) {
		cookieStore.set("active_playlist_id", nextPlaylistId, {
			path: "/",
			maxAge: 60 * 60 * 24 * 30,
		});
	} else {
		cookieStore.delete("active_playlist_id");
	}
}
