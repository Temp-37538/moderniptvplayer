import { getAuthenticatedUserId } from "@/server/auth-utils";
import {
	HttpResponseTooLargeError,
	HttpTimeoutError,
	safeFetch,
	UnsafeUrlError,
} from "@/server/safe-http";
import { type NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
// Authenticated content: never let a shared cache serve it to someone else.
const CACHE_CONTROL = "private, max-age=86400, stale-while-revalidate=86400";
// The proxy serves third-party content from the app's own origin. If someone
// opens an image URL directly (e.g. an SVG), scripts must not run.
const CONTENT_SECURITY_POLICY =
	"default-src 'none'; style-src 'unsafe-inline'; sandbox";

function makeError(status: number, message: string) {
	return NextResponse.json({ error: message }, { status });
}

function logProxyRefusal(reason: string, details: Record<string, unknown>) {
	console.warn("[image-proxy] denied", { reason, ...details });
}

function logProxyFailure(reason: string, details: Record<string, unknown>) {
	console.warn("[image-proxy] upstream-failure", { reason, ...details });
}

export async function GET(request: NextRequest) {
	const userId = await getAuthenticatedUserId();

	if (!userId) {
		logProxyRefusal("unauthenticated", {});
		return makeError(401, "Authentication required.");
	}

	const rawUrl = request.nextUrl.searchParams.get("url")?.trim();

	if (!rawUrl) {
		logProxyRefusal("missing-url-param", {});
		return makeError(400, "Invalid image URL.");
	}

	let targetUrl: URL;
	try {
		targetUrl = new URL(rawUrl);
	} catch {
		logProxyRefusal("invalid-url", {});
		return makeError(400, "Invalid image URL.");
	}

	if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
		logProxyRefusal("invalid-scheme", { protocol: targetUrl.protocol });
		return makeError(400, "Invalid image URL.");
	}

	targetUrl.hash = "";

	try {
		// Address checks happen at connection time (and on every redirect hop),
		// so a hostname cannot resolve to a public address during validation and
		// to a private one when the connection is made.
		const upstream = await safeFetch(targetUrl, {
			headers: { accept: "image/*" },
			timeoutMs: REQUEST_TIMEOUT_MS,
			maxBytes: MAX_IMAGE_BYTES,
			maxRedirects: MAX_REDIRECTS,
		});

		if (!upstream.ok) {
			logProxyFailure("non-2xx-upstream", {
				host: upstream.url.hostname,
				status: upstream.status,
			});
			return makeError(502, "Unable to fetch image.");
		}

		const contentType = String(
			upstream.headers["content-type"] ?? "",
		).toLowerCase();
		if (!contentType.startsWith("image/")) {
			logProxyRefusal("invalid-mime", {
				host: upstream.url.hostname,
				contentType: contentType || "missing",
			});
			return makeError(415, "Unsupported image format.");
		}

		const responseHeaders = new Headers();
		responseHeaders.set("Content-Type", contentType);
		responseHeaders.set("Cache-Control", CACHE_CONTROL);
		responseHeaders.set("X-Content-Type-Options", "nosniff");
		responseHeaders.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
		const etag = upstream.headers.etag;
		const lastModified = upstream.headers["last-modified"];
		if (etag) {
			responseHeaders.set("ETag", etag);
		}
		if (lastModified) {
			responseHeaders.set("Last-Modified", lastModified);
		}

		return new NextResponse(new Uint8Array(upstream.body), {
			status: 200,
			headers: responseHeaders,
		});
	} catch (error) {
		if (error instanceof UnsafeUrlError) {
			logProxyRefusal("forbidden-destination", {
				host: targetUrl.hostname,
				reason: error.message,
			});
			return makeError(403, "Image host is not allowed.");
		}
		if (error instanceof HttpTimeoutError) {
			logProxyFailure("timeout", { host: targetUrl.hostname });
			return makeError(504, "Image source timed out.");
		}
		if (error instanceof HttpResponseTooLargeError) {
			logProxyFailure("payload-too-large", { host: targetUrl.hostname });
			return makeError(502, "Unable to fetch image.");
		}
		logProxyFailure("request-failed", { host: targetUrl.hostname });
		return makeError(502, "Unable to fetch image.");
	}
}
