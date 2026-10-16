import {
	buildLiveStreamUrl,
	ID_PATTERN,
	proxyUpstream,
	requireStreamUser,
	streamError,
} from "@/server/stream-proxy";
import { getCachedPlaylistByUserAndId } from "@/server/xtream";
import type { NextRequest } from "next/server";

type Context = {
	params: Promise<{ playlistId: string; channelId: string }>;
};

// Live channel. `ext=m3u8` (default) is HLS: the playlist is rewritten and its
// segments come back through /api/stream/hls. `ext=ts` is a continuous MPEG-TS
// stream, relayed as it arrives.
export async function GET(request: NextRequest, { params }: Context) {
	const user = await requireStreamUser();
	if ("response" in user) {
		return user.response;
	}

	const { playlistId, channelId } = await params;
	if (!ID_PATTERN.test(playlistId) || !ID_PATTERN.test(channelId)) {
		return streamError(400, "Invalid stream.");
	}
	const extension =
		request.nextUrl.searchParams.get("ext") === "ts" ? "ts" : "m3u8";

	const playlist = await getCachedPlaylistByUserAndId(user.userId, playlistId);
	if (!playlist) {
		return streamError(404, "Playlist not found.");
	}

	return proxyUpstream(
		request,
		buildLiveStreamUrl(playlist, channelId, extension),
		{ userId: user.userId, manifest: extension === "m3u8" },
	);
}
