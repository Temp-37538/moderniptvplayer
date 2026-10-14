import "server-only";
import prisma from "@moderniptvplayer/db";
import Cryptr from "cryptr";
import { env } from "@moderniptvplayer/env/server";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUserId } from "./auth-utils";
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

export async function doesPlaylistExist(username: string, serverUrl: string) {
	const userId = await requireAuthenticatedUserId();

	const playlist = await prisma.playlist.findFirst({
		where: {
			userId,
			username,
			serverUrl: normalizeServerUrl(serverUrl),
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
		const playlist = await prisma.playlist.create({
			data: {
				username,
				serverUrl: normalizeServerUrl(serverUrl),
				playlistName,
				password: encryptedPassword,
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
