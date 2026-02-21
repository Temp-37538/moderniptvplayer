import "server-only";
import prisma from "../../../../packages/db/src/index";
import Cryptr from "cryptr";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId } from "./auth-utils";

const cryptr = new Cryptr(process.env.SECRET_KEY!);

export async function doesPlaylistExist(
	username: string,
	serverUrl: string,
	password: string,
) {
	const userId = await getAuthenticatedUserId();

	const playlist = await prisma.playlist.findUnique({
		where: {
			username,
			serverUrl,
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
	}
}

export async function isPlaylistValid(
	username: string,
	serverUrl: string,
	password: string,
) {
	await getAuthenticatedUserId();

	const test = await fetch(
		`${serverUrl}/player_api.php?username=${username}&password=${password}`,
		{
			method: "GET",
		},
	);
	return test;
}

export async function addPlaylist(
	username: string,
	serverUrl: string,
	playlistName: string,
	password: string,
) {
	const userId = await getAuthenticatedUserId();

	try {
		const encryptedPassword = cryptr.encrypt(password);
		const playlist = await prisma.playlist.create({
			data: {
				username,
				serverUrl,
				playlistName,
				password: encryptedPassword,
				userId,
			},
		});
		revalidatePath("/dashboard", "layout");
		return playlist;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}

export async function deletePlaylist(playlistId: string) {
	const userId = await getAuthenticatedUserId();

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
	const userId = await getAuthenticatedUserId();

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
