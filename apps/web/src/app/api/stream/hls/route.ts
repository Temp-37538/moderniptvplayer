import { openStreamToken } from "@/server/stream-token";
import {
	proxyUpstream,
	requireStreamUser,
	streamError,
} from "@/server/stream-proxy";
import type { NextRequest } from "next/server";

// Playlists, segments, keys and subtitles referenced by a rewritten HLS
// manifest. The client can only ask for what a manifest handed it: the target
// is sealed in the token, which is bound to the signed-in user.
export async function GET(request: NextRequest) {
	const user = await requireStreamUser();
	if ("response" in user) {
		return user.response;
	}

	const token = request.nextUrl.searchParams.get("t");
	const payload = token ? openStreamToken(token) : null;
	if (!payload || payload.uid !== user.userId) {
		return streamError(403, "Invalid or expired stream token.");
	}

	return proxyUpstream(request, payload.u, {
		userId: user.userId,
		manifest: payload.k === "m",
	});
}
