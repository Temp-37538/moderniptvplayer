import "server-only";
import { Readable } from "node:stream";
import { env } from "@moderniptvplayer/env/server";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "./auth-utils";
import { looksLikeHlsManifest, rewriteHlsManifest } from "./hls-manifest";
import { checkRateLimit } from "./rate-limit";
import {
	HttpResponseTooLargeError,
	HttpTimeoutError,
	UnsafeUrlError,
} from "./safe-http";
import { type SafeStreamResponse, safeStream } from "./safe-stream";
import { sealStreamToken } from "./stream-token";

export const HLS_PROXY_PATH = "/api/stream/hls";

const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
// A live viewer costs a few requests per second at most; this only stops abuse.
const RATE_LIMIT = 3_000;
const RATE_WINDOW_MS = 60_000;
const MANIFEST_CONTENT_TYPE = "application/vnd.apple.mpegurl";
// Third-party bytes are served from the app's own origin: if someone opens a
// stream URL directly, nothing may execute.
const CONTENT_SECURITY_POLICY = "default-src 'none'; sandbox";
const SAFE_CONTENT_TYPE =
	/^(?:(?:video|audio)\/[a-z0-9.+-]+|application\/(?:octet-stream|mp4|mp2t|x-mpegurl|vnd\.apple\.mpegurl)|binary\/octet-stream|text\/vtt)$/;
// A single, simple byte range. Anything else is dropped rather than forwarded.
const RANGE_PATTERN = /^bytes=\d*-\d*$/;

export const ID_PATTERN = /^[\w-]{1,64}$/;
export const EXTENSION_PATTERN = /^[a-z0-9]{2,5}$/i;

/**
 * `upstreamStatus` (what the provider answered) and `code` (a network error
 * code such as ECONNRESET) carry no secret: the player shows them to explain
 * why a stream does not start.
 */
export function streamError(
	status: number,
	message: string,
	details: { upstreamStatus?: number; code?: string } = {},
) {
	return NextResponse.json(
		{ error: message, ...details },
		{ status, headers: { "Cache-Control": "no-store" } },
	);
}

function networkErrorCode(error: unknown) {
	const code =
		error instanceof Error ? (error as { code?: unknown }).code : undefined;
	return typeof code === "string" && /^E[A-Z0-9]+$/.test(code)
		? code
		: undefined;
}

/** Session check shared by every stream route (these are not page routes). */
export async function requireStreamUser(): Promise<
	{ userId: string } | { response: NextResponse }
> {
	const userId = await getAuthenticatedUserId();
	if (!userId) {
		return { response: streamError(401, "Authentication required.") };
	}
	const limit = checkRateLimit(`stream:${userId}`, RATE_LIMIT, RATE_WINDOW_MS);
	if (!limit.allowed) {
		const response = streamError(429, "Too many requests.");
		response.headers.set("Retry-After", String(limit.retryAfterSeconds));
		return { response };
	}
	return { userId };
}

export function buildLiveStreamUrl(
	playlist: { serverUrl: string; username: string; password: string },
	channelId: string,
	extension: "m3u8" | "ts",
) {
	const base = playlist.serverUrl.replace(/\/$/, "");
	const user = encodeURIComponent(playlist.username.trim());
	const pass = encodeURIComponent(playlist.password.trim());
	return `${base}/live/${user}/${pass}/${encodeURIComponent(channelId)}.${extension}`;
}

function forwardedHeaders(request: NextRequest): Record<string, string> {
	const range = request.headers.get("range");
	return range && RANGE_PATTERN.test(range) ? { range } : {};
}

function safeContentType(value: unknown, fallback: string) {
	const type = String(value ?? "")
		.split(";")[0]
		?.trim()
		.toLowerCase();
	return type && SAFE_CONTENT_TYPE.test(type) ? type : fallback;
}

async function readText(body: Readable, maxBytes: number) {
	const chunks: Buffer[] = [];
	let total = 0;
	for await (const chunk of body) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		total += buffer.length;
		if (total > maxBytes) {
			body.destroy();
			throw new HttpResponseTooLargeError(maxBytes);
		}
		chunks.push(buffer);
	}
	return Buffer.concat(chunks).toString("utf8");
}

function baseHeaders(contentType: string) {
	const headers = new Headers();
	headers.set("Content-Type", contentType);
	headers.set("Cache-Control", "private, no-store");
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
	return headers;
}

/** Statuses the player can act on; the upstream body is never relayed. */
function refuseStatus(upstream: SafeStreamResponse) {
	if (upstream.status === 200 || upstream.status === 206) {
		return null;
	}
	upstream.body.destroy();
	console.warn("[stream-proxy] upstream-status", {
		host: upstream.url.hostname,
		status: upstream.status,
	});
	if (upstream.status === 416) {
		const headers = new Headers({ "Cache-Control": "no-store" });
		const contentRange = upstream.headers["content-range"];
		if (typeof contentRange === "string") {
			headers.set("Content-Range", contentRange);
		}
		return new NextResponse(null, { status: 416, headers });
	}
	const details = { upstreamStatus: upstream.status };
	return upstream.status === 404
		? streamError(404, "Stream not found.", details)
		: streamError(502, "The playlist server refused the stream.", details);
}

async function manifestResponse(upstream: SafeStreamResponse, userId: string) {
	const text = await readText(upstream.body, MAX_MANIFEST_BYTES);
	const rewritten = rewriteHlsManifest(text, upstream.url, (url, kind) => {
		const token = sealStreamToken(url, userId, kind === "playlist" ? "m" : "r");
		return `${HLS_PROXY_PATH}?t=${token}`;
	});
	return new NextResponse(rewritten, {
		status: 200,
		headers: baseHeaders(MANIFEST_CONTENT_TYPE),
	});
}

function mediaResponse(upstream: SafeStreamResponse) {
	const headers = baseHeaders(
		safeContentType(
			upstream.headers["content-type"],
			"application/octet-stream",
		),
	);
	for (const name of ["content-length", "content-range", "accept-ranges"]) {
		const value = upstream.headers[name];
		if (typeof value === "string") {
			headers.set(name, value);
		}
	}
	// Closing the browser side (zapping, tab closed) must close the provider
	// side too: accounts only allow a few simultaneous connections.
	const body = Readable.toWeb(upstream.body) as unknown as ReadableStream;
	return new NextResponse(body, { status: upstream.status, headers });
}

function toErrorResponse(error: unknown, host: string) {
	if (error instanceof UnsafeUrlError) {
		console.warn("[stream-proxy] denied", { host, reason: error.message });
		return streamError(403, "Stream host is not allowed.");
	}
	if (error instanceof HttpTimeoutError) {
		console.warn("[stream-proxy] timeout", { host });
		return streamError(504, "The playlist server timed out.");
	}
	if (isAbortError(error)) {
		return new NextResponse(null, { status: 499 });
	}
	const code = networkErrorCode(error);
	console.warn("[stream-proxy] request-failed", { host, code });
	return streamError(502, "Unable to reach the playlist server.", { code });
}

function isAbortError(error: unknown) {
	return error instanceof Error && error.message === "Request aborted";
}

/**
 * Fetches `upstreamUrl` and relays it. HLS playlists are rewritten so that
 * every reference comes back through `/api/stream/hls`; everything else is
 * streamed as is, with byte ranges so that seeking works.
 *
 * `manifest` says the caller already knows the target is a playlist.
 */
export async function proxyUpstream(
	request: NextRequest,
	upstreamUrl: string,
	{ userId, manifest }: { userId: string; manifest: boolean },
) {
	let host = "unknown";
	try {
		host = new URL(upstreamUrl).hostname;
	} catch {
		// safeStream rejects it below.
	}

	try {
		const upstream = await safeStream(upstreamUrl, {
			headers: forwardedHeaders(request),
			signal: request.signal,
			allowPrivateHosts: env.ALLOW_PRIVATE_PLAYLIST_HOSTS,
		});

		const refused = refuseStatus(upstream);
		if (refused) {
			return refused;
		}

		const isManifest =
			manifest ||
			looksLikeHlsManifest(
				String(upstream.headers["content-type"] ?? ""),
				upstream.url,
			);
		return isManifest
			? await manifestResponse(upstream, userId)
			: mediaResponse(upstream);
	} catch (error) {
		return toErrorResponse(error, host);
	}
}
