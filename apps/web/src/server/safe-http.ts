import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import zlib from "node:zlib";

/**
 * HTTP client for requests to user-controlled hosts (playlist servers, image
 * URLs). Protects against SSRF: the destination address is validated at
 * connection time (no DNS rebinding window), redirects are re-validated hop by
 * hop, and every request has a deadline and a size limit.
 */

export class UnsafeUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UnsafeUrlError";
	}
}

export class HttpTimeoutError extends Error {
	constructor() {
		super("Request timed out");
		this.name = "HttpTimeoutError";
	}
}

export class HttpResponseTooLargeError extends Error {
	constructor(maxBytes: number) {
		super(`Response exceeds ${maxBytes} bytes`);
		this.name = "HttpResponseTooLargeError";
	}
}

export class HttpStatusError extends Error {
	readonly status: number;

	constructor(status: number) {
		super(`Unexpected HTTP status ${status}`);
		this.name = "HttpStatusError";
		this.status = status;
	}
}

const blockedHostnames = new Set([
	"localhost",
	"metadata",
	"metadata.google.internal",
	"instance-data",
	"instance-data.ec2.internal",
]);

const blockedHostnameSuffixes = [
	".localhost",
	".local",
	".localdomain",
	".internal",
	".home.arpa",
];

const blockedRanges = new BlockList();
for (const [network, prefix] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.88.99.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
] as const) {
	blockedRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
	["::", 96],
	["64:ff9b::", 96],
	["64:ff9b:1::", 48],
	["100::", 64],
	["2001::", 32],
	["2001:db8::", 32],
	["2002::", 16],
	["fc00::", 7],
	["fe80::", 10],
	["fec0::", 10],
	["ff00::", 8],
] as const) {
	blockedRanges.addSubnet(network, prefix, "ipv6");
}

export function normalizeHostname(hostname: string) {
	const lower = hostname.toLowerCase().replace(/\.$/, "");
	return lower.startsWith("[") && lower.endsWith("]")
		? lower.slice(1, -1)
		: lower;
}

function isBlockedHostname(hostname: string) {
	return (
		blockedHostnames.has(hostname) ||
		blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix))
	);
}

/** Fails closed: anything that is not a valid public IP is refused. */
export function isBlockedAddress(address: string) {
	const bare = address.split("%")[0] ?? address;
	const type = isIP(bare);
	if (type === 0) {
		return true;
	}
	return blockedRanges.check(bare, type === 4 ? "ipv4" : "ipv6");
}

/** Synchronous checks that do not need DNS. Throws UnsafeUrlError. */
export function assertHttpUrl(url: URL, allowPrivateHosts = false) {
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new UnsafeUrlError("Only http and https URLs are allowed");
	}
	if (url.username || url.password) {
		throw new UnsafeUrlError("Credentials in the URL are not allowed");
	}
	const hostname = normalizeHostname(url.hostname);
	if (!hostname) {
		throw new UnsafeUrlError("Missing hostname");
	}
	if (allowPrivateHosts) {
		return;
	}
	if (isBlockedHostname(hostname)) {
		throw new UnsafeUrlError("Host is not allowed");
	}
	if (isIP(hostname) !== 0 && isBlockedAddress(hostname)) {
		throw new UnsafeUrlError("Address is not allowed");
	}
}

/**
 * DNS lookup used for the actual connection: the address that gets validated
 * is the address that gets connected to, which closes the rebinding window.
 */
export const strictLookup: LookupFunction = (hostname, options, callback) => {
	dnsLookup(
		hostname,
		{ ...options, all: true, verbatim: true },
		(error, addresses) => {
			if (error) {
				callback(error, "", 0);
				return;
			}
			const list = addresses ?? [];
			const first = list[0];
			if (!first) {
				callback(
					Object.assign(new Error("No DNS records"), { code: "ENOTFOUND" }),
					"",
					0,
				);
				return;
			}
			if (list.some((entry) => isBlockedAddress(entry.address))) {
				callback(
					new UnsafeUrlError("Address is not allowed") as NodeJS.ErrnoException,
					"",
					0,
				);
				return;
			}
			if (options.all) {
				callback(null, list);
				return;
			}
			callback(null, first.address, first.family);
		},
	);
};

// Separate pools: a socket opened without address validation must never be
// reused by a strict request to the same host:port.
export const agents = {
	strict: {
		http: new http.Agent({ keepAlive: true, maxSockets: 32 }),
		https: new https.Agent({ keepAlive: true, maxSockets: 32 }),
	},
	permissive: {
		http: new http.Agent({ keepAlive: true, maxSockets: 32 }),
		https: new https.Agent({ keepAlive: true, maxSockets: 32 }),
	},
};

export type SafeFetchOptions = {
	headers?: Record<string, string>;
	/** Overall deadline, redirects included. Default 20s. */
	timeoutMs?: number;
	/** Maximum decompressed body size. Default 100 MiB. */
	maxBytes?: number;
	/** Default 3. */
	maxRedirects?: number;
	/** Allow private/loopback destinations (self-hosted LAN setups only). */
	allowPrivateHosts?: boolean;
};

export type SafeFetchResponse = {
	status: number;
	ok: boolean;
	headers: http.IncomingHttpHeaders;
	url: URL;
	body: Buffer;
};

type ResolvedOptions = Required<Omit<SafeFetchOptions, "headers">> & {
	headers: Record<string, string>;
};

type RawResponse = {
	status: number;
	headers: http.IncomingHttpHeaders;
	body: Buffer;
	location?: string;
};

function requestOnce(
	url: URL,
	options: ResolvedOptions,
	deadline: number,
): Promise<RawResponse> {
	return new Promise((resolve, reject) => {
		const remaining = deadline - Date.now();
		if (remaining <= 0) {
			reject(new HttpTimeoutError());
			return;
		}

		let settled = false;
		const settle = (action: () => void) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			action();
		};
		const fail = (error: unknown) => settle(() => reject(error));

		const isHttps = url.protocol === "https:";
		const pool = options.allowPrivateHosts ? agents.permissive : agents.strict;
		const request = (isHttps ? https : http).request(
			{
				protocol: url.protocol,
				hostname: normalizeHostname(url.hostname),
				port: url.port || undefined,
				path: `${url.pathname}${url.search}`,
				method: "GET",
				headers: {
					"accept-encoding": "gzip, deflate, br",
					...options.headers,
				},
				agent: isHttps ? pool.https : pool.http,
				lookup: options.allowPrivateHosts ? undefined : strictLookup,
			},
			(response) => {
				const status = response.statusCode ?? 0;
				const location = response.headers.location;

				if (status >= 300 && status < 400 && location) {
					response.resume();
					settle(() =>
						resolve({
							status,
							headers: response.headers,
							body: Buffer.alloc(0),
							location,
						}),
					);
					return;
				}

				const encoding = String(response.headers["content-encoding"] ?? "")
					.toLowerCase()
					.trim();
				let stream: Readable = response;
				if (
					encoding === "gzip" ||
					encoding === "x-gzip" ||
					encoding === "deflate"
				) {
					stream = response.pipe(zlib.createUnzip());
				} else if (encoding === "br") {
					stream = response.pipe(zlib.createBrotliDecompress());
				} else if (encoding && encoding !== "identity") {
					response.resume();
					fail(new Error(`Unsupported content-encoding: ${encoding}`));
					request.destroy();
					return;
				}

				const declaredLength = Number.parseInt(
					String(response.headers["content-length"] ?? ""),
					10,
				);
				if (
					!encoding &&
					Number.isFinite(declaredLength) &&
					declaredLength > options.maxBytes
				) {
					fail(new HttpResponseTooLargeError(options.maxBytes));
					request.destroy();
					return;
				}

				const chunks: Buffer[] = [];
				let total = 0;
				stream.on("data", (chunk: Buffer) => {
					total += chunk.length;
					if (total > options.maxBytes) {
						fail(new HttpResponseTooLargeError(options.maxBytes));
						request.destroy();
						return;
					}
					chunks.push(chunk);
				});
				stream.on("end", () =>
					settle(() =>
						resolve({
							status,
							headers: response.headers,
							body: Buffer.concat(chunks, total),
						}),
					),
				);
				stream.on("error", fail);
				response.on("error", fail);
			},
		);

		const timer = setTimeout(() => {
			fail(new HttpTimeoutError());
			request.destroy();
		}, remaining);

		request.on("error", fail);
		request.end();
	});
}

export async function safeFetch(
	input: string | URL,
	options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
	const resolved: ResolvedOptions = {
		headers: { "user-agent": "node", accept: "*/*", ...options.headers },
		timeoutMs: options.timeoutMs ?? 20_000,
		maxBytes: options.maxBytes ?? 100 * 1024 * 1024,
		maxRedirects: options.maxRedirects ?? 3,
		allowPrivateHosts: options.allowPrivateHosts ?? false,
	};

	let url: URL;
	try {
		url = new URL(input.toString());
	} catch {
		throw new UnsafeUrlError("Invalid URL");
	}

	const deadline = Date.now() + resolved.timeoutMs;

	for (let hop = 0; hop <= resolved.maxRedirects; hop += 1) {
		assertHttpUrl(url, resolved.allowPrivateHosts);
		const raw = await requestOnce(url, resolved, deadline);

		if (raw.location) {
			try {
				url = new URL(raw.location, url);
			} catch {
				throw new UnsafeUrlError("Invalid redirect location");
			}
			url.hash = "";
			continue;
		}

		return {
			status: raw.status,
			ok: raw.status >= 200 && raw.status < 300,
			headers: raw.headers,
			url,
			body: raw.body,
		};
	}

	throw new Error("Too many redirects");
}

export async function safeFetchJson<T = unknown>(
	input: string | URL,
	options: SafeFetchOptions = {},
): Promise<T> {
	const response = await safeFetch(input, {
		...options,
		headers: { accept: "application/json", ...options.headers },
	});

	if (!response.ok) {
		throw new HttpStatusError(response.status);
	}

	try {
		return JSON.parse(
			response.body.toString("utf8").replace(/^\uFEFF/, ""),
		) as T;
	} catch {
		throw new Error("Invalid JSON response");
	}
}
