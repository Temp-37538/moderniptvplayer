import {
	EXTENSION_PATTERN,
	ID_PATTERN,
	proxyUpstream,
	requireStreamUser,
	streamError,
} from "@/server/stream-proxy";
import {
	createXtreamClient,
	getCachedPlaylistByUserAndId,
} from "@/server/xtream";
import type { NextRequest } from "next/server";

type Context = {
	params: Promise<{ playlistId: string; kind: string; streamId: string }>;
};

// Films and episodes. Seeking relies on the Range header being relayed.
export async function GET(request: NextRequest, { params }: Context) {
	const user = await requireStreamUser();
	if ("response" in user) {
		return user.response;
	}

	const { playlistId, kind, streamId } = await params;
	const extension = request.nextUrl.searchParams.get("ext") ?? "mp4";
	if (
		(kind !== "movie" && kind !== "episode") ||
		!ID_PATTERN.test(playlistId) ||
		!ID_PATTERN.test(streamId) ||
		!EXTENSION_PATTERN.test(extension)
	) {
		return streamError(400, "Invalid stream.");
	}

	const playlist = await getCachedPlaylistByUserAndId(user.userId, playlistId);
	if (!playlist) {
		return streamError(404, "Playlist not found.");
	}

	// The upstream URL (with the credentials) is built here, from what is
	// stored for the user: the client only ever names an item.
	const upstreamUrl = createXtreamClient(playlist).generateStreamUrl({
		type: kind,
		streamId,
		extension: extension.toLowerCase(),
	});
	return proxyUpstream(request, upstreamUrl, {
		userId: user.userId,
		manifest: false,
	});
}
