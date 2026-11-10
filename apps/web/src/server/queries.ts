import "server-only";
import prisma from "@moderniptvplayer/db";
import Cryptr from "cryptr";
import { env } from "@moderniptvplayer/env/server";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUserId } from "./auth-utils";
import { forgetM3uCatalog } from "./m3u-catalog";
import { forgetCatalogIndex } from "./catalog-index";
import {
	convertM3uRows,
	M3uConversionTargetMissingError,
	type SavedItemCounts,
} from "./m3u-conversion";
import { parseM3uUrl } from "./m3u";
import { xtreamIdentityKey } from "./playlist-identity";
import { safeFetch } from "./safe-http";
import { forgetPlaylistCredentials } from "./xtream";

const cryptr = new Cryptr(env.SECRET_KEY);

/** Canonical form used for storage and for the per-user uniqueness check. */
export function normalizeServerUrl(value: string): string {
	const url = new URL(value.trim());
	url.hash = "";
	url.search = "";
	url.username = "";
	url.password = "";
	return url.toString().replace(/\/+$/, "");
}

type PlaylistValidationResult = {
	ok: boolean;
	status?: number;
	error?: "network";
	message?: string;
};

export class PlaylistAlreadyExistsError extends Error {
	constructor() {
		super("Playlist already exists");
		this.name = "PlaylistAlreadyExistsError";
	}
}

const isUniqueViolation = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: unknown }).code === "P2002";

export async function doesPlaylistExist(
	username: string,
	serverUrl: string,
	excludePlaylistId?: string,
) {
	const userId = await requireAuthenticatedUserId();

	const playlist = await prisma.playlist.findFirst({
		where: {
			userId,
			username,
			serverUrl: normalizeServerUrl(serverUrl),
			...(excludePlaylistId ? { id: { not: excludePlaylistId } } : {}),
		},
		select: { id: true },
	});

	return playlist !== null;
}

export async function doesM3uPlaylistExist(
	identityKey: string,
	excludePlaylistId?: string,
) {
	const userId = await requireAuthenticatedUserId();
	const playlist = await prisma.playlist.findFirst({
		where: {
			userId,
			identityKey,
			...(excludePlaylistId ? { id: { not: excludePlaylistId } } : {}),
		},
		select: { id: true },
	});
	return playlist !== null;
}

export async function isPlaylistValid(
	username: string,
	serverUrl: string,
	password: string,
): Promise<PlaylistValidationResult> {
	await requireAuthenticatedUserId();

	try {
		const url = new URL(`${normalizeServerUrl(serverUrl)}/player_api.php`);
		url.searchParams.set("username", username);
		url.searchParams.set("password", password);

		// Same restrictions as every other request to a user-supplied host:
		// no private addresses (unless explicitly enabled), bounded time/size.
		const response = await safeFetch(url, {
			timeoutMs: 10_000,
			maxBytes: 1024 * 1024,
			allowPrivateHosts: env.ALLOW_PRIVATE_PLAYLIST_HOSTS,
		});

		return {
			ok: response.ok,
			status: response.status,
		};
	} catch (error) {
		// Blocked destinations and network failures are reported identically so
		// the form cannot be used to probe internal addresses.
		console.warn(
			"[playlist-validation] request failed:",
			error instanceof Error ? error.name : "unknown",
		);
		return {
			ok: false,
			error: "network",
			message: "Unable to reach the playlist server",
		};
	}
}

export async function addPlaylist(
	username: string,
	serverUrl: string,
	playlistName: string,
	password: string,
) {
	const userId = await requireAuthenticatedUserId();

	try {
		const encryptedPassword = cryptr.encrypt(password);
		const normalized = normalizeServerUrl(serverUrl);
		const playlist = await prisma.playlist.create({
			data: {
				source: "XTREAM",
				username,
				serverUrl: normalized,
				playlistName,
				password: encryptedPassword,
				identityKey: xtreamIdentityKey(normalized, username),
				userId,
			},
		});
		revalidatePath("/dashboard", "layout");
		return playlist;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new PlaylistAlreadyExistsError();
		}
		console.error("Error adding playlist:", error);
		throw new Error("Failed to add playlists");
	}
}

/**
 * Update the existing playlist row. Favorites, watch later, and viewing
 * progress point at this id, so a password or host change must not recreate it.
 * Pass a null password to keep the encrypted value already stored.
 */
export async function updatePlaylist(
	playlistId: string,
	username: string,
	serverUrl: string,
	playlistName: string,
	password: string | null,
) {
	const userId = await requireAuthenticatedUserId();

	let updated = false;
	try {
		const normalized = normalizeServerUrl(serverUrl);
		const result = await prisma.playlist.updateMany({
			where: {
				id: playlistId,
				userId,
				source: "XTREAM",
			},
			data: {
				username,
				serverUrl: normalized,
				playlistName,
				identityKey: xtreamIdentityKey(normalized, username),
				...(password ? { password: cryptr.encrypt(password) } : {}),
			},
		});
		updated = result.count > 0;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new PlaylistAlreadyExistsError();
		}
		console.error("Error updating playlist:", error);
		throw new Error("Failed to update playlist");
	}

	if (!updated) {
		throw new Error("Playlist not found");
	}

	forgetPlaylistCredentials(playlistId);
	await forgetCatalogIndex(playlistId);
	revalidatePath("/dashboard", "layout");
}

export async function addM3uPlaylist(playlistName: string, storedUrl: string) {
	const userId = await requireAuthenticatedUserId();
	const parts = parseM3uUrl(storedUrl);
	try {
		const playlist = await prisma.playlist.create({
			data: {
				source: "M3U",
				serverUrl: parts.origin,
				username: parts.identityKey,
				playlistName,
				password: cryptr.encrypt("m3u"),
				m3uUrl: cryptr.encrypt(parts.storedUrl),
				identityKey: parts.identityKey,
				userId,
			},
		});
		revalidatePath("/dashboard", "layout");
		return playlist;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new PlaylistAlreadyExistsError();
		}
		console.error(
			"Error adding M3U playlist:",
			error instanceof Error ? error.name : "unknown",
		);
		throw new Error("Failed to add playlists");
	}
}

/**
 * Update the same M3U row. A null URL keeps the encrypted playlist URL.
 * Favorites, watch later, and viewing progress stay on this id.
 */
export async function updateM3uPlaylist(
	playlistId: string,
	playlistName: string,
	storedUrl: string | null,
) {
	const userId = await requireAuthenticatedUserId();
	const nextUrl = storedUrl ? parseM3uUrl(storedUrl) : null;
	let updated = false;
	try {
		const result = await prisma.playlist.updateMany({
			where: {
				id: playlistId,
				userId,
				source: "M3U",
			},
			data: {
				playlistName,
				...(nextUrl
					? {
							serverUrl: nextUrl.origin,
							username: nextUrl.identityKey,
							identityKey: nextUrl.identityKey,
							m3uUrl: cryptr.encrypt(nextUrl.storedUrl),
						}
					: {}),
			},
		});
		updated = result.count > 0;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new PlaylistAlreadyExistsError();
		}
		console.error(
			"Error updating M3U playlist:",
			error instanceof Error ? error.name : "unknown",
		);
		throw new Error("Failed to update playlist");
	}
	if (!updated) {
		throw new Error("Playlist not found");
	}
	forgetPlaylistCredentials(playlistId);
	forgetM3uCatalog(playlistId);
	if (storedUrl !== null) {
		await forgetCatalogIndex(playlistId);
	}
	revalidatePath("/dashboard", "layout");
}

/**
 * Turn an existing M3U row into Xtream without changing its id.
 * M3U item and category ids are hashes that the Xtream catalog does not
 * contain, so favorites, watch later, progress, and category choices saved for
 * this playlist are removed in the same transaction instead of becoming dead
 * links. The encrypted M3U URL is cleared so the credential query is not kept.
 * Returns how many rows were removed.
 */
export async function replaceM3uPlaylistWithXtream(
	playlistId: string,
	playlistName: string,
	username: string,
	serverUrl: string,
	password: string,
): Promise<SavedItemCounts> {
	const userId = await requireAuthenticatedUserId();
	const normalized = normalizeServerUrl(serverUrl);
	let cleared: SavedItemCounts;
	try {
		cleared = await prisma.$transaction((tx) =>
			convertM3uRows({
				convert: () =>
					tx.playlist.updateMany({
						where: {
							id: playlistId,
							userId,
							source: "M3U",
						},
						data: {
							source: "XTREAM",
							username,
							serverUrl: normalized,
							playlistName,
							password: cryptr.encrypt(password),
							m3uUrl: null,
							identityKey: xtreamIdentityKey(normalized, username),
						},
					}),
				clear: {
					favorites: () =>
						tx.favorite.deleteMany({ where: { playlistId, userId } }),
					watchLater: () =>
						tx.watchLater.deleteMany({ where: { playlistId, userId } }),
					progress: () =>
						tx.watchProgress.deleteMany({ where: { playlistId, userId } }),
					categoryPreferences: () =>
						tx.categoryPreference.deleteMany({ where: { playlistId, userId } }),
				},
			}),
		);
	} catch (error) {
		if (error instanceof M3uConversionTargetMissingError) {
			throw new Error("Playlist not found");
		}
		if (isUniqueViolation(error)) {
			throw new PlaylistAlreadyExistsError();
		}
		console.error(
			"Error converting playlist:",
			error instanceof Error ? error.name : "unknown",
		);
		throw new Error("Failed to update playlist");
	}
	forgetPlaylistCredentials(playlistId);
	forgetM3uCatalog(playlistId);
	await forgetCatalogIndex(playlistId);
	revalidatePath("/dashboard", "layout");
	return cleared;
}

export async function deletePlaylist(playlistId: string) {
	const userId = await requireAuthenticatedUserId();

	try {
		await prisma.playlist.delete({
			where: {
				id: playlistId,
				userId,
			},
		});
		forgetPlaylistCredentials(playlistId);
		forgetM3uCatalog(playlistId);
		revalidatePath("/dashboard", "layout");
	} catch (error) {
		console.error("Error deleting playlist:", error);
		throw new Error("Failed to delete playlist");
	}
}

export async function fetchPlaylists() {
	const userId = await requireAuthenticatedUserId();

	try {
		// The encrypted password is never selected: these rows are passed to
		// client components and would otherwise be serialized to the browser.
		const playlists = await prisma.playlist.findMany({
			where: {
				userId,
			},
			select: {
				id: true,
				source: true,
				serverUrl: true,
				username: true,
				playlistName: true,
				userId: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: { createdAt: "asc" },
		});
		return playlists;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}
