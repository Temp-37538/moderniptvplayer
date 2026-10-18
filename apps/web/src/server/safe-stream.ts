import "server-only";
import http from "node:http";
import https from "node:https";
import type { Readable } from "node:stream";
import zlib from "node:zlib";
import {
	agents,
	assertHttpUrl,
	HttpTimeoutError,
	normalizeHostname,
	strictLookup,
	UnsafeUrlError,
} from "./safe-http";

/**
 * Streaming counterpart of `safeFetch`, for media. It applies the same
 * destination checks (address validated at connection time, every redirect hop
 * re-validated) but hands the body back as a stream instead of buffering it, so
 * a film or a live channel never sits in memory.
 */

export type SafeStreamOptions = {
	headers?: Record<string, string>;
	/** Longest silence (headers or body) before giving up. Default 20s. */
	idleTimeoutMs?: number;
	/** Default 3. */
	maxRedirects?: number;
	/** Allow private/loopback destinations (self-hosted LAN setups only). */
	allowPrivateHosts?: boolean;
	/** Aborting closes the upstream connection (the viewer left). */
	signal?: AbortSignal;
};

export type SafeStreamResponse = {
	status: number;
	headers: http.IncomingHttpHeaders;
	/** Final URL, after redirects. Relative references resolve against it. */
	url: URL;
	body: Readable;
};

type ResolvedOptions = {
	headers: Record<string, string>;
	idleTimeoutMs: number;
	maxRedirects: number;
	allowPrivateHosts: boolean;
	signal: AbortSignal | undefined;
};

function requestOnce(
	url: URL,
	options: ResolvedOptions,
): Promise<http.IncomingMessage> {
	return new Promise((resolve, reject) => {
		if (options.signal?.aborted) {
			reject(new Error("Request aborted"));
			return;
		}

		const isHttps = url.protocol === "https:";
		const pool = options.allowPrivateHosts ? agents.permissive : agents.strict;
		const request = (isHttps ? https : http).request(
			{
				protocol: url.protocol,
				hostname: normalizeHostname(url.hostname),
				port: url.port || undefined,
				path: `${url.pathname}${url.search}`,
				method: "GET",
				// Media is never compressed upstream: a gzip layer would only add
				// latency to a live stream.
				headers: {
					"accept-encoding": "identity",
					"user-agent": "VLC/3.0.20 LibVLC/3.0.20",
					accept: "*/*",
					...options.headers,
				},
				agent: isHttps ? pool.https : pool.http,
				lookup: options.allowPrivateHosts ? undefined : strictLookup,
			},
			resolve,
		);

		const onAbort = () => request.destroy();
		options.signal?.addEventListener("abort", onAbort, { once: true });
		request.once("close", () =>
			options.signal?.removeEventListener("abort", onAbort),
		);
		request.setTimeout(options.idleTimeoutMs, () =>
			request.destroy(new HttpTimeoutError()),
		);
		// After the response is handed over, socket errors surface on the body.
		request.on("error", reject);
		request.end();
	});
}

function decodeResponse(response: http.IncomingMessage) {
	const encoding = String(response.headers["content-encoding"] ?? "")
		.toLowerCase()
		.trim();
	if (!encoding || encoding === "identity") {
		return { body: response as Readable, headers: response.headers };
	}

	let decoder: zlib.Gunzip | zlib.BrotliDecompress;
	if (encoding === "gzip" || encoding === "x-gzip" || encoding === "deflate") {
		decoder = zlib.createUnzip();
	} else if (encoding === "br") {
		decoder = zlib.createBrotliDecompress();
	} else {
		response.destroy();
		throw new Error(`Unsupported content-encoding: ${encoding}`);
	}

	response.on("error", (error) => decoder.destroy(error));
	decoder.on("close", () => response.destroy());
	response.pipe(decoder);

	const headers = Object.fromEntries(
		Object.entries(response.headers).filter(
			([name]) => name !== "content-length" && name !== "content-encoding",
		),
	);
	return { body: decoder as Readable, headers };
}

export async function safeStream(
	input: string | URL,
	options: SafeStreamOptions = {},
): Promise<SafeStreamResponse> {
	const resolved: ResolvedOptions = {
		headers: options.headers ?? {},
		idleTimeoutMs: options.idleTimeoutMs ?? 20_000,
		maxRedirects: options.maxRedirects ?? 3,
		allowPrivateHosts: options.allowPrivateHosts ?? false,
		signal: options.signal,
	};

	let url: URL;
	try {
		url = new URL(input.toString());
	} catch {
		throw new UnsafeUrlError("Invalid URL");
	}

	for (let hop = 0; hop <= resolved.maxRedirects; hop += 1) {
		assertHttpUrl(url, resolved.allowPrivateHosts);
		const response = await requestOnce(url, resolved);
		const status = response.statusCode ?? 0;
		const location = response.headers.location;

		if (status >= 300 && status < 400 && location) {
			response.resume();
			try {
				url = new URL(location, url);
			} catch {
				throw new UnsafeUrlError("Invalid redirect location");
			}
			url.hash = "";
			continue;
		}

		const { body, headers } = decodeResponse(response);
		return { status, headers, url, body };
	}

	throw new Error("Too many redirects");
}
