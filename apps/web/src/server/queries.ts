import "server-only";
import prisma from "../../../../packages/db/src/index";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import Cryptr from "cryptr";
import "dotenv/config";
import { revalidatePath } from "next/cache";

const cryptr = new Cryptr(process.env.SECRET_KEY!);

export async function doesPlaylistExist(
	username: string,
	serverUrl: string,
	password: string,
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

	const playlist = await prisma.playlist.findUnique({
		where: {
			username,
			serverUrl,
			userId: session.user.id,
		},
		select: {
			password: true,
		},
	});

	revalidatePath("/dashboard", "layout");

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
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

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
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

	try {
		const encryptedPassword = cryptr.encrypt(password);
		const playlist = await prisma.playlist.create({
			data: {
				username,
				serverUrl,
				playlistName,
				password: encryptedPassword,
				userId: session.user.id,
			},
		});

		return playlist;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}

export async function fetchPlaylists() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

	try {
		const playlists = await prisma.playlist.findMany({
			where: {
				userId: session.user.id,
			},
		});
		return playlists;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}
