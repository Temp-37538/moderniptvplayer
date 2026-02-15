import "server-only";
import prisma from "../../../../packages/db/src/index";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";

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

	const playlist = await prisma.playlist.findFirst({
		where: {
			username,
			serverUrl,
			password,
			userId: session.user.id,
		},
	});

	if (playlist) {
		return true;
	} else {
		return false;
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

	try {
		const playlist = await prisma.playlist.create({
			data: {
				username,
				serverUrl,
				playlistName,
				password,
				userId: session!.user.id,
			},
		});

		if (!session?.user.id) {
			throw new Error("User not authenticated");
		}

		return playlist;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}
