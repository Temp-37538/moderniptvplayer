"use server";
import type { FormState, xtreamFormData } from "@/components/types";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { ACTIVE_PLAYLIST_COOKIE } from "./active-playlist";
import { requireAuthenticatedUserId } from "./auth-utils";
import { getPlaylistCacheTags } from "./cached-content";
import {
	addPlaylist,
	deletePlaylist,
	doesPlaylistExist,
	isPlaylistValid,
	normalizeServerUrl,
	PlaylistAlreadyExistsError,
	updatePlaylist,
} from "./queries";
import { checkRateLimit } from "./rate-limit";
import { forgetPlaylistStatus, getPlaylistById } from "./xtream";

const VALIDATION_LIMIT = 10;
const VALIDATION_WINDOW_MS = 60_000;

function alreadyExistsState(rawData: xtreamFormData): FormState {
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

export async function validate(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const xtreamCodesSchema = z.object({
		username: z.string().trim().min(1, "Username is required").max(128),
		password: z.string().trim().min(1, "Password is required").max(256),
		serverUrl: z
			.string()
			.trim()
			.max(2048)
			.pipe(
				z.url({
					protocol: /^https?$/,
					error: "Please enter a valid http(s) URL",
				}),
			),
		playlistName: z
			.string()
			.trim()
			.min(1, "Playlist name is required")
			.max(100),
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

	// This action makes the server contact a user-supplied host: bound how
	// often one account can trigger it.
	const userId = await requireAuthenticatedUserId();
	const limit = checkRateLimit(
		`validate-playlist:${userId}`,
		VALIDATION_LIMIT,
		VALIDATION_WINDOW_MS,
	);
	if (!limit.allowed) {
		return {
			errors: {},
			success: false,
			inputs: rawData,
			message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.`,
		};
	}

	const alreadyExists = await doesPlaylistExist(
		validatedData.data.username,
		validatedData.data.serverUrl,
	);

	if (alreadyExists) {
		return alreadyExistsState(rawData);
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

	try {
		await addPlaylist(
			validatedData.data.username,
			validatedData.data.serverUrl,
			validatedData.data.playlistName,
			validatedData.data.password,
		);
	} catch (error) {
		if (error instanceof PlaylistAlreadyExistsError) {
			return alreadyExistsState(rawData);
		}
		throw error;
	}

	return {
		errors: {},
		success: true,
		inputs: validatedData.data,
		message: "Playlist added successfully !",
	};
}

function readFormText(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}

export async function updatePlaylistAction(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const credentialsSchema = z.object({
		username: z.string().trim().min(1, "Username is required").max(128),
		password: z.string().trim().max(256),
		serverUrl: z
			.string()
			.trim()
			.max(2048)
			.pipe(
				z.url({
					protocol: /^https?$/,
					error: "Please enter a valid http(s) URL",
				}),
			),
		playlistName: z
			.string()
			.trim()
			.min(1, "Playlist name is required")
			.max(100),
	});

	const rawData: xtreamFormData = {
		username: readFormText(formData, "username"),
		password: readFormText(formData, "password"),
		playlistName: readFormText(formData, "playlistName"),
		serverUrl: readFormText(formData, "serverUrl"),
	};
	const playlistIdResult = z
		.string()
		.trim()
		.min(1)
		.max(128)
		.safeParse(readFormText(formData, "playlistId"));
	const validatedData = credentialsSchema.safeParse(rawData);

	if (!validatedData.success) {
		const { properties } = z.treeifyError(validatedData.error);
		return {
			errors: { properties },
			success: false,
			inputs: rawData,
			message: "Please fix the errors above.",
		};
	}

	if (!playlistIdResult.success) {
		return {
			errors: {},
			success: false,
			inputs: rawData,
			message: "Playlist not found.",
		};
	}

	const playlistId = playlistIdResult.data;
	const current = await getPlaylistById(playlistId);
	if (!current) {
		return {
			errors: {},
			success: false,
			inputs: rawData,
			message: "Playlist not found.",
		};
	}

	let normalizedServerUrl: string;
	try {
		normalizedServerUrl = normalizeServerUrl(validatedData.data.serverUrl);
	} catch {
		return {
			errors: {
				properties: {
					serverUrl: {
						errors: ["Please enter a valid http(s) URL"],
					},
				},
			},
			success: false,
			inputs: rawData,
			message: "Please fix the errors above.",
		};
	}

	const passwordProvided = validatedData.data.password.length > 0;
	const usernameChanged = validatedData.data.username !== current.username;
	const serverChanged = normalizedServerUrl !== current.serverUrl;
	const connectionChanged =
		passwordProvided || usernameChanged || serverChanged;

	// A display-name change does not contact the provider. Connection changes
	// reuse the same checks as creating a playlist, then write the same row.
	if (connectionChanged) {
		const userId = await requireAuthenticatedUserId();
		const limit = checkRateLimit(
			`validate-playlist:${userId}`,
			VALIDATION_LIMIT,
			VALIDATION_WINDOW_MS,
		);
		if (!limit.allowed) {
			return {
				errors: {},
				success: false,
				inputs: rawData,
				message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.`,
			};
		}

		if (usernameChanged || serverChanged) {
			const alreadyExists = await doesPlaylistExist(
				validatedData.data.username,
				normalizedServerUrl,
				playlistId,
			);
			if (alreadyExists) {
				return {
					errors: {
						properties: {
							serverUrl: {
								errors: [
									"Another playlist already uses this server and username",
								],
							},
							username: {
								errors: [
									"Another playlist already uses this server and username",
								],
							},
						},
					},
					success: false,
					inputs: rawData,
					message: "Another playlist already uses this server and username.",
				};
			}
		}

		const valid = await isPlaylistValid(
			validatedData.data.username,
			normalizedServerUrl,
			passwordProvided ? validatedData.data.password : current.password,
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
	}

	const savedInputs: xtreamFormData = {
		username: validatedData.data.username,
		password: "",
		playlistName: validatedData.data.playlistName,
		serverUrl: normalizedServerUrl,
	};

	if (
		!connectionChanged &&
		validatedData.data.playlistName === current.playlistName
	) {
		return {
			errors: {},
			success: true,
			inputs: savedInputs,
			message: "Playlist updated.",
		};
	}

	try {
		await updatePlaylist(
			playlistId,
			validatedData.data.username,
			normalizedServerUrl,
			validatedData.data.playlistName,
			passwordProvided ? validatedData.data.password : null,
		);
	} catch (error) {
		if (error instanceof PlaylistAlreadyExistsError) {
			return {
				errors: {
					properties: {
						serverUrl: {
							errors: [
								"Another playlist already uses this server and username",
							],
						},
						username: {
							errors: [
								"Another playlist already uses this server and username",
							],
						},
					},
				},
				success: false,
				inputs: rawData,
				message: "Another playlist already uses this server and username.",
			};
		}
		if (error instanceof Error && error.message === "Playlist not found") {
			return {
				errors: {},
				success: false,
				inputs: rawData,
				message: "Playlist not found.",
			};
		}
		throw error;
	}

	if (connectionChanged) {
		forgetPlaylistStatus(playlistId);
		expirePlaylistCacheTags(playlistId);
	}

	return {
		errors: {},
		success: true,
		inputs: savedInputs,
		message: "Playlist updated.",
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
		// Only read on the server (resolveActivePlaylistId): the browser never
		// needs to see it, and it should not travel on cross-site requests.
		cookieStore.set(ACTIVE_PLAYLIST_COOKIE, nextPlaylistId, {
			path: "/",
			maxAge: 60 * 60 * 24 * 30,
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
	} else {
		cookieStore.delete(ACTIVE_PLAYLIST_COOKIE);
	}
}
