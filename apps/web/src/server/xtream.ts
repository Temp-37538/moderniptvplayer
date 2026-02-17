import "server-only"; 
import prisma from "../../../../packages/db/src/index";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import Cryptr from "cryptr";
import "dotenv/config";
import { Xtream } from "@iptv/xtream-api";
import { standardizedSerializer } from "@iptv/xtream-api/standardized";

const cryptr = new Cryptr(process.env.SECRET_KEY!);

export async function getPlaylistById(playlistId: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

	const playlist = await prisma.playlist.findUnique({
		where: {
			id: playlistId,
			userId: session.user.id,
		},
	});

	if (!playlist) {
		return null;
	}

	const decryptedPassword = cryptr.decrypt(playlist.password);

	return {
		serverUrl: playlist.serverUrl,
		username: playlist.username,
		password: decryptedPassword,
		playlistName: playlist.playlistName,
	};
}

export function createXtreamClient(playlist: {
	serverUrl: string;
	username: string;
	password: string;
}) {
	const xtream = new Xtream({
		url: playlist.serverUrl,
		username: playlist.username,
		password: playlist.password,
		serializer: standardizedSerializer,
	});

	return xtream;
}
