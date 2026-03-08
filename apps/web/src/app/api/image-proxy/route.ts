import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { auth } from "@moderniptvplayer/auth";
import { type NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=86400";

const blockedHosts = new Set([
	"localhost",
	"metadata.google.internal",
	"metadata",
	"instance-data.ec2.internal",
]);

const blockedIpRanges = new BlockList();
blockedIpRanges.addSubnet("0.0.0.0", 8, "ipv4");
blockedIpRanges.addSubnet("10.0.0.0", 8, "ipv4");
blockedIpRanges.addSubnet("100.64.0.0", 10, "ipv4");
blockedIpRanges.addSubnet("127.0.0.0", 8, "ipv4");
blockedIpRanges.addSubnet("169.254.0.0", 16, "ipv4");
blockedIpRanges.addSubnet("172.16.0.0", 12, "ipv4");
blockedIpRanges.addSubnet("192.168.0.0", 16, "ipv4");
blockedIpRanges.addSubnet("198.18.0.0", 15, "ipv4");
blockedIpRanges.addSubnet("224.0.0.0", 4, "ipv4");
blockedIpRanges.addSubnet("::", 128, "ipv6");
blockedIpRanges.addSubnet("::1", 128, "ipv6");
blockedIpRanges.addSubnet("fc00::", 7, "ipv6");
blockedIpRanges.addSubnet("fe80::", 10, "ipv6");

function normalizeHostname(hostname: string) {
	return hostname.toLowerCase().replace(/\.$/, "");
}

function stripIpv6Brackets(hostname: string) {
	if (hostname.startsWith("[") && hostname.endsWith("]")) {
		return hostname.slice(1, -1);
	}
	return hostname;
}

function isBlockedHostname(hostname: string) {
	return (
		blockedHosts.has(hostname) ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local")
	);
}

function isBlockedIp(address: string) {
	const type = isIP(address);
	if (!type) {
		return false;
	}

	return blockedIpRanges.check(address, type === 4 ? "ipv4" : "ipv6");
}

function makeError(status: number, message: string) {
	return NextResponse.json({ error: message }, { status });
}

function logProxyRefusal(reason: string, details: Record<string, unknown>) {
	console.warn("[image-proxy] denied", { reason, ...details });
}

function logProxyFailure(reason: string, details: Record<string, unknown>) {
	console.warn("[image-proxy] upstream-failure", { reason, ...details });
}

async function validatePublicHost(targetUrl: URL) {
	const normalizedHostname = normalizeHostname(targetUrl.hostname);
	const hostForIpCheck = stripIpv6Brackets(normalizedHostname);

	if (isBlockedHostname(normalizedHostname)) {
		logProxyRefusal("forbidden-hostname", { host: normalizedHostname });
		return makeError(403, "Image host is not allowed.");
	}

	if (isBlockedIp(hostForIpCheck)) {
		logProxyRefusal("forbidden-ip-literal", { host: normalizedHostname });
		return makeError(403, "Image host is not allowed.");
	}

	if (!isIP(hostForIpCheck)) {
		try {
			const records = await lookup(hostForIpCheck, {
				all: true,
				verbatim: true,
			});
			if (records.length === 0) {
				logProxyFailure("dns-empty", { host: normalizedHostname });
				return makeError(502, "Unable to fetch image.");
			}

			for (const record of records) {
				if (isBlockedIp(record.address)) {
					logProxyRefusal("forbidden-ip-dns", {
						host: normalizedHostname,
						resolved: record.address,
					});
					return makeError(403, "Image host is not allowed.");
				}
			}
		} catch {
			logProxyFailure("dns-resolution-failed", { host: normalizedHostname });
			return makeError(502, "Unable to fetch image.");
		}
	}

	return undefined;
}

async function readBodyWithLimit(
	body: ReadableStream<Uint8Array>,
	maxBytes: number,
) {
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let totalBytes = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		if (!value) {
			continue;
		}

		totalBytes += value.byteLength;
		if (totalBytes > maxBytes) {
			return null;
		}

		chunks.push(value);
	}

	const combined = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return combined;
}

function isRedirectStatus(status: number) {
	return status >= 300 && status < 400;
}

async function fetchWithValidatedRedirects(
	initialUrl: URL,
	signal: AbortSignal,
) {
	let currentUrl = initialUrl;

	for (
		let redirectCount = 0;
		redirectCount <= MAX_REDIRECTS;
		redirectCount += 1
	) {
		const hostError = await validatePublicHost(currentUrl);
		if (hostError) {
			return { response: hostError, finalUrl: currentUrl } as const;
		}

		const upstreamResponse = await fetch(currentUrl.toString(), {
			method: "GET",
			redirect: "manual",
			signal,
			headers: {
				Accept: "image/*",
			},
			cache: "no-store",
		});

		if (!isRedirectStatus(upstreamResponse.status)) {
			return { response: upstreamResponse, finalUrl: currentUrl } as const;
		}

		const location = upstreamResponse.headers.get("location");
		if (!location) {
			logProxyFailure("redirect-without-location", {
				host: currentUrl.hostname,
				status: upstreamResponse.status,
			});
			return {
				response: makeError(502, "Unable to fetch image."),
				finalUrl: currentUrl,
			} as const;
		}

		let nextUrl: URL;
		try {
			nextUrl = new URL(location, currentUrl);
		} catch {
			logProxyFailure("invalid-redirect-location", {
				host: currentUrl.hostname,
			});
			return {
				response: makeError(502, "Unable to fetch image."),
				finalUrl: currentUrl,
			} as const;
		}

		if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
			logProxyRefusal("invalid-redirect-scheme", {
				from: currentUrl.hostname,
				protocol: nextUrl.protocol,
			});
			return {
				response: makeError(502, "Unable to fetch image."),
				finalUrl: currentUrl,
			} as const;
		}

		nextUrl.hash = "";
		currentUrl = nextUrl;
	}

	logProxyFailure("too-many-redirects", { host: initialUrl.hostname });
	return {
		response: makeError(502, "Unable to fetch image."),
		finalUrl: initialUrl,
	} as const;
}

export async function GET(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user.id) {
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

	const abortController = new AbortController();
	const timeoutId = setTimeout(
		() => abortController.abort(),
		REQUEST_TIMEOUT_MS,
	);

	try {
		const upstream = await fetchWithValidatedRedirects(
			targetUrl,
			abortController.signal,
		);
		if (upstream.response instanceof NextResponse) {
			return upstream.response;
		}

		const upstreamResponse = upstream.response;

		if (!upstreamResponse.ok) {
			logProxyFailure("non-2xx-upstream", {
				host: upstream.finalUrl.hostname,
				status: upstreamResponse.status,
			});
			return makeError(502, "Unable to fetch image.");
		}

		const contentType =
			upstreamResponse.headers.get("content-type")?.toLowerCase() ?? "";
		if (!contentType.startsWith("image/")) {
			logProxyRefusal("invalid-mime", {
				host: upstream.finalUrl.hostname,
				contentType: contentType || "missing",
			});
			return makeError(415, "Unsupported image format.");
		}

		const contentLengthHeader = upstreamResponse.headers.get("content-length");
		const contentLength = contentLengthHeader
			? Number.parseInt(contentLengthHeader, 10)
			: Number.NaN;
		if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
			logProxyFailure("payload-too-large-header", {
				host: upstream.finalUrl.hostname,
				contentLength,
			});
			return makeError(502, "Unable to fetch image.");
		}

		if (!upstreamResponse.body) {
			logProxyFailure("missing-response-body", {
				host: upstream.finalUrl.hostname,
			});
			return makeError(502, "Unable to fetch image.");
		}

		const body = await readBodyWithLimit(
			upstreamResponse.body,
			MAX_IMAGE_BYTES,
		);
		if (!body) {
			logProxyFailure("payload-too-large-stream", {
				host: upstream.finalUrl.hostname,
			});
			return makeError(502, "Unable to fetch image.");
		}

		const responseHeaders = new Headers();
		responseHeaders.set("Content-Type", contentType);
		responseHeaders.set("Cache-Control", CACHE_CONTROL);
		const etag = upstreamResponse.headers.get("etag");
		const lastModified = upstreamResponse.headers.get("last-modified");
		if (etag) {
			responseHeaders.set("ETag", etag);
		}
		if (lastModified) {
			responseHeaders.set("Last-Modified", lastModified);
		}

		return new NextResponse(body, {
			status: 200,
			headers: responseHeaders,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			logProxyFailure("timeout", { host: targetUrl.hostname });
			return makeError(504, "Image source timed out.");
		}

		logProxyFailure("request-failed", { host: targetUrl.hostname });
		return makeError(502, "Unable to fetch image.");
	} finally {
		clearTimeout(timeoutId);
	}
}
