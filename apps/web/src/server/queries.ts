import "server-only";
import prisma from "@moderniptvplayer/db";
import Cryptr from "cryptr";
import { env } from "@moderniptvplayer/env/server";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUserId } from "./auth-utils";

const cryptr = new Cryptr(env.SECRET_KEY);

const normalizeUrl = (url: string): string => url.replace(/\/$/, "");

type PlaylistValidationResult = {
	ok: boolean;
	status?: number;
	error?: "network";
	message?: string;
};

export async function doesPlaylistExist(
	username: string,
	serverUrl: string,
	password: string,
) {
	const userId = await requireAuthenticatedUserId();
	const normalizedUrl = normalizeUrl(serverUrl);

	const playlist = await prisma.playlist.findUnique({
		where: {
			username,
			serverUrl: normalizedUrl,
			userId,
		},
		select: {
			password: true,
		},
	});

	if (!playlist) {
		return false;
	} else if (password === cryptr.decrypt(playlist.password)) {
		return true;
	} else {
		return false;
	}
}

export async function isPlaylistValid(
	username: string,
	serverUrl: string,
	password: string,
): Promise<PlaylistValidationResult> {
	await requireAuthenticatedUserId();

	const url = new URL(
		"/player_api.php",
		serverUrl.endsWith("/") ? serverUrl : `${serverUrl}/`,
	);
	url.searchParams.set("username", username);
	url.searchParams.set("password", password);

	try {
		const response = await fetch(url, {
			method: "GET",
		});

		return {
			ok: response.ok,
			status: response.status,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown network error";
		return {
			ok: false,
			error: "network",
			message,
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
		const normalizedUrl = normalizeUrl(serverUrl);
		const encryptedPassword = cryptr.encrypt(password);
		const playlist = await prisma.playlist.create({
			data: {
				username,
				serverUrl: normalizedUrl,
				playlistName,
				password: encryptedPassword,
				userId,
			},
		});
		revalidatePath("/dashboard", "layout");
		return playlist;
	} catch (error) {
		console.error("Error fetching playlists:", error);
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
		revalidatePath("/dashboard", "layout");
	} catch (error) {
		console.error("Error deleting playlist:", error);
		throw new Error("Failed to delete playlist");
	}
}

export async function fetchPlaylists() {
	const userId = await requireAuthenticatedUserId();

	try {
		const playlists = await prisma.playlist.findMany({
			where: {
				userId,
			},
		});
		return playlists;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}
