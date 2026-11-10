"use server";
import type {
	FormState,
	M3uFormState,
	xtreamFormData,
} from "@/components/types";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { ACTIVE_PLAYLIST_COOKIE } from "./active-playlist";
import { requireAuthenticatedUserId } from "./auth-utils";
import { getPlaylistCacheTags } from "./cached-content";
import { forgetM3uCatalog, retrieveSubmittedM3u } from "./m3u-catalog";
import {
	decideM3uImport,
	describeM3uFailure,
	M3uPlaylistError,
	parseM3uUrl,
	type XtreamPlaylistTarget,
} from "./m3u";
import {
	addM3uPlaylist,
	addPlaylist,
	deletePlaylist,
	doesM3uPlaylistExist,
	doesPlaylistExist,
	isPlaylistValid,
	normalizeServerUrl,
	PlaylistAlreadyExistsError,
	replaceM3uPlaylistWithXtream,
	updateM3uPlaylist,
	updatePlaylist,
} from "./queries";
import {
	conversionSuccessMessage,
	M3U_ADDED_AS_XTREAM_MESSAGE,
	type SavedItemCounts,
} from "./m3u-conversion";
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

const m3uUrlSchema = z.string().trim().min(1, "M3U URL is required").max(4096);

function m3uFailureState(
	inputs: { m3uUrl: string; playlistName: string },
	message: string,
	field: "m3uUrl" | "playlistName" = "m3uUrl",
): M3uFormState {
	return {
		errors: { [field]: message },
		success: false,
		inputs,
		message,
	};
}

function playlistLabel(rawName: string, serverLike: string) {
	const trimmed = rawName.trim().slice(0, 100);
	if (trimmed) {
		return trimmed;
	}
	try {
		return new URL(serverLike).host.slice(0, 100) || "M3U playlist";
	} catch {
		return "M3U playlist";
	}
}

type SubmittedPlaylist =
	| {
			mode: "m3u";
			parts: ReturnType<typeof parseM3uUrl>;
			playlistName: string;
	  }
	| {
			mode: "xtream";
			target: XtreamPlaylistTarget;
			playlistName: string;
	  };

async function importSubmittedPlaylist(
	rawUrl: string,
	rawName: string,
): Promise<SubmittedPlaylist> {
	let parts: ReturnType<typeof parseM3uUrl>;
	try {
		parts = parseM3uUrl(rawUrl);
	} catch (error) {
		throw error instanceof M3uPlaylistError
			? error
			: new M3uPlaylistError("invalid_url", "Enter an http(s) playlist URL.");
	}
	const retrieved = await retrieveSubmittedM3u(parts.storedUrl);
	const decision = await decideM3uImport({
		storedUrl: parts.storedUrl,
		status: retrieved.status,
		body: retrieved.body,
		validateXtream: async (target) => {
			const valid = await isPlaylistValid(
				target.username,
				target.serverUrl,
				target.password,
			);
			return { ok: valid.ok, error: valid.error };
		},
	});
	if (decision.mode === "xtream") {
		return {
			mode: "xtream",
			target: decision.target,
			playlistName: playlistLabel(rawName, decision.target.serverUrl),
		};
	}
	return {
		mode: "m3u",
		parts,
		playlistName: playlistLabel(rawName, parts.origin),
	};
}

export async function addM3uPlaylistAction(
	_prev: M3uFormState,
	formData: FormData,
): Promise<M3uFormState> {
	const rawUrl = readFormText(formData, "m3uUrl");
	const rawName = readFormText(formData, "playlistName");
	const inputs = { m3uUrl: rawUrl, playlistName: rawName };
	const parsedUrl = m3uUrlSchema.safeParse(rawUrl);
	if (!parsedUrl.success) {
		return m3uFailureState(
			inputs,
			parsedUrl.error.issues[0]?.message ?? "M3U URL is required",
		);
	}
	const parsedName = z.string().trim().max(100).safeParse(rawName);
	if (!parsedName.success) {
		return m3uFailureState(
			inputs,
			"Playlist name is too long.",
			"playlistName",
		);
	}

	const userId = await requireAuthenticatedUserId();
	const limit = checkRateLimit(
		`validate-playlist:${userId}`,
		VALIDATION_LIMIT,
		VALIDATION_WINDOW_MS,
	);
	if (!limit.allowed) {
		return m3uFailureState(
			inputs,
			`Too many attempts. Try again in ${limit.retryAfterSeconds}s.`,
		);
	}

	let imported: SubmittedPlaylist;
	try {
		imported = await importSubmittedPlaylist(parsedUrl.data, parsedName.data);
	} catch (error) {
		return m3uFailureState(inputs, describeM3uFailure(error));
	}

	if (imported.mode === "xtream") {
		if (
			await doesPlaylistExist(
				imported.target.username,
				imported.target.serverUrl,
			)
		) {
			return m3uFailureState(inputs, "You have already added this playlist.");
		}
		try {
			const playlist = await addPlaylist(
				imported.target.username,
				imported.target.serverUrl,
				imported.playlistName,
				imported.target.password,
			);
			return {
				errors: {},
				success: true,
				inputs: { m3uUrl: "", playlistName: imported.playlistName },
				message: M3U_ADDED_AS_XTREAM_MESSAGE,
				playlistId: playlist.id,
				convertedToXtream: true,
			};
		} catch (error) {
			if (error instanceof PlaylistAlreadyExistsError) {
				return m3uFailureState(inputs, "You have already added this playlist.");
			}
			throw error;
		}
	}

	if (await doesM3uPlaylistExist(imported.parts.identityKey)) {
		return m3uFailureState(inputs, "You have already added this playlist.");
	}

	try {
		const playlist = await addM3uPlaylist(
			imported.playlistName,
			imported.parts.storedUrl,
		);
		return {
			errors: {},
			success: true,
			inputs: { m3uUrl: "", playlistName: imported.playlistName },
			message: "Playlist added successfully !",
			playlistId: playlist.id,
		};
	} catch (error) {
		if (error instanceof PlaylistAlreadyExistsError) {
			return m3uFailureState(inputs, "You have already added this playlist.");
		}
		throw error;
	}
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

	if (current.source === "M3U") {
		return {
			errors: {},
			success: false,
			inputs: rawData,
			message: "This playlist uses an M3U URL. Update the name or URL instead.",
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
			message: "No changes made.",
			changed: false,
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

export async function updateM3uPlaylistAction(
	_prev: M3uFormState,
	formData: FormData,
): Promise<M3uFormState> {
	const playlistId = readFormText(formData, "playlistId").trim();
	const rawName = readFormText(formData, "playlistName");
	const rawUrl = readFormText(formData, "m3uUrl").trim();
	const inputs = { m3uUrl: rawUrl, playlistName: rawName };
	if (!playlistId || playlistId.length > 128) {
		return m3uFailureState(inputs, "Playlist not found.", "playlistName");
	}
	const parsedName = z
		.string()
		.trim()
		.min(1, "Playlist name is required")
		.max(100)
		.safeParse(rawName);
	if (!parsedName.success) {
		return m3uFailureState(
			inputs,
			parsedName.error.issues[0]?.message ?? "Playlist name is required",
			"playlistName",
		);
	}

	const current = await getPlaylistById(playlistId);
	if (!current || current.source !== "M3U") {
		return m3uFailureState(inputs, "Playlist not found.", "playlistName");
	}

	if (!rawUrl && parsedName.data === current.playlistName) {
		return {
			errors: {},
			success: true,
			inputs: { m3uUrl: "", playlistName: parsedName.data },
			message: "No changes made.",
			changed: false,
			playlistId,
		};
	}

	if (!rawUrl) {
		await updateM3uPlaylist(playlistId, parsedName.data, null);
		return {
			errors: {},
			success: true,
			inputs: { m3uUrl: "", playlistName: parsedName.data },
			message: "Playlist updated.",
			playlistId,
		};
	}

	const userId = await requireAuthenticatedUserId();
	const limit = checkRateLimit(
		`validate-playlist:${userId}`,
		VALIDATION_LIMIT,
		VALIDATION_WINDOW_MS,
	);
	if (!limit.allowed) {
		return m3uFailureState(
			inputs,
			`Too many attempts. Try again in ${limit.retryAfterSeconds}s.`,
		);
	}

	let imported: SubmittedPlaylist;
	try {
		imported = await importSubmittedPlaylist(rawUrl, parsedName.data);
	} catch (error) {
		return m3uFailureState(inputs, describeM3uFailure(error));
	}

	if (imported.mode === "xtream") {
		if (
			await doesPlaylistExist(
				imported.target.username,
				imported.target.serverUrl,
				playlistId,
			)
		) {
			return m3uFailureState(inputs, "You have already added this playlist.");
		}
		let cleared: SavedItemCounts;
		try {
			cleared = await replaceM3uPlaylistWithXtream(
				playlistId,
				imported.playlistName,
				imported.target.username,
				imported.target.serverUrl,
				imported.target.password,
			);
		} catch (error) {
			if (error instanceof PlaylistAlreadyExistsError) {
				return m3uFailureState(inputs, "You have already added this playlist.");
			}
			if (error instanceof Error && error.message === "Playlist not found") {
				return m3uFailureState(inputs, "Playlist not found.", "playlistName");
			}
			throw error;
		}
		forgetPlaylistStatus(playlistId);
		expirePlaylistCacheTags(playlistId);
		return {
			errors: {},
			success: true,
			inputs: { m3uUrl: "", playlistName: imported.playlistName },
			message: conversionSuccessMessage(cleared),
			playlistId,
			convertedToXtream: true,
		};
	}

	if (
		imported.parts.identityKey !== currentIdentity(current) &&
		(await doesM3uPlaylistExist(imported.parts.identityKey, playlistId))
	) {
		return m3uFailureState(inputs, "You have already added this playlist.");
	}

	try {
		await updateM3uPlaylist(
			playlistId,
			imported.playlistName,
			imported.parts.storedUrl,
		);
	} catch (error) {
		if (error instanceof PlaylistAlreadyExistsError) {
			return m3uFailureState(inputs, "You have already added this playlist.");
		}
		if (error instanceof Error && error.message === "Playlist not found") {
			return m3uFailureState(inputs, "Playlist not found.", "playlistName");
		}
		throw error;
	}

	forgetPlaylistStatus(playlistId);
	expirePlaylistCacheTags(playlistId);
	return {
		errors: {},
		success: true,
		inputs: { m3uUrl: "", playlistName: imported.playlistName },
		message: "Playlist updated.",
		playlistId,
	};
}

function currentIdentity(playlist: { m3uUrl: string | null }): string {
	if (!playlist.m3uUrl) {
		return "";
	}
	try {
		return parseM3uUrl(playlist.m3uUrl).identityKey;
	} catch {
		return "";
	}
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
	forgetM3uCatalog(playlistId);
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
