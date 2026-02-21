"use server";
import type { FormState, xtreamFormData } from "@/components/types";
import { z } from "zod";
import {
	addPlaylist,
	deletePlaylist,
	doesPlaylistExist,
	isPlaylistValid,
} from "./queries";

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

export async function deletePlaylistAction(playlistId: string) {
	await deletePlaylist(playlistId);
}
