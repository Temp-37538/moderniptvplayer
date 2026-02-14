import "server-only";
import prisma from "../../../../packages/db/src/index";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";

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
				userId: session?.user.id || "",
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
