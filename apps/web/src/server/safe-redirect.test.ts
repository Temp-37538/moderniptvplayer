import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { safeFetch } from "./safe-http.ts";

register(new URL("./safe-redirect-loader.mjs", import.meta.url).href, {
	parentURL: pathToFileURL(import.meta.dirname).href,
});

const { safeStream } = await import("./safe-stream.ts");

const AUTH = "Bearer redirect-test";
const START = "https://playlist.example/start";

type Step = {
	status: number;
	headers: Record<string, string>;
};

type Recorded = {
	protocol: string;
	hostname: string;
	port: string;
	path: string;
	headers: Record<string, string | string[] | undefined>;
};

function installRequestMock(steps: readonly Step[]) {
	const calls: Recorded[] = [];
	const original = { http: http.request, https: https.request };

	const request = ((
		options: http.RequestOptions,
		callback: (response: http.IncomingMessage) => void,
	) => {
		const req = new EventEmitter() as http.ClientRequest;
		req.end = (() => {
			const step = steps[calls.length];
			if (!step) {
				throw new Error("unexpected request");
			}
			calls.push({
				protocol: String(options.protocol ?? ""),
				hostname: String(options.hostname ?? ""),
				port: options.port == null ? "" : String(options.port),
				path: String(options.path ?? ""),
				headers: {
					...(options.headers as Record<string, string | string[] | undefined>),
				},
			});
			const response = new EventEmitter() as http.IncomingMessage;
			response.statusCode = step.status;
			response.headers = step.headers;
			response.resume = () => response;
			response.destroy = () => response;
			callback(response);
			if (step.status < 300 || step.status >= 400) {
				queueMicrotask(() => response.emit("end"));
			}
			return req;
		}) as http.ClientRequest["end"];
		req.destroy = (() => req) as http.ClientRequest["destroy"];
		req.setTimeout = (() => req) as http.ClientRequest["setTimeout"];
		return req;
	}) as typeof http.request;

	http.request = request;
	https.request = request;
	return {
		calls,
		restore() {
			http.request = original.http;
			https.request = original.https;
		},
	};
}

function authorizationOf(
	headers: Record<string, string | string[] | undefined>,
) {
	for (const [name, value] of Object.entries(headers)) {
		if (name.toLowerCase() === "authorization") {
			return value;
		}
	}
	return undefined;
}

test("safeFetch drops Authorization when a redirect changes origin", async (t) => {
	const cases = [
		{
			name: "other host",
			location: "https://cdn.example/media",
		},
		{
			name: "other protocol",
			location: "http://playlist.example/media",
		},
		{
			name: "other port",
			location: "https://playlist.example:8443/media",
		},
		{
			name: "network-path host",
			location: "//cdn.example/media",
		},
	];

	for (const item of cases) {
		await t.test(item.name, async () => {
			const mock = installRequestMock([
				{ status: 302, headers: { location: item.location } },
				{ status: 200, headers: {} },
			]);
			try {
				const response = await safeFetch(START, {
					headers: { Authorization: AUTH },
				});
				assert.equal(response.status, 200);
				assert.equal(mock.calls.length, 2);
				assert.equal(authorizationOf(mock.calls[0]?.headers ?? {}), AUTH);
				assert.equal(authorizationOf(mock.calls[1]?.headers ?? {}), undefined);
			} finally {
				mock.restore();
			}
		});
	}
});

test("safeFetch keeps Authorization on a same-origin relative redirect", async () => {
	const mock = installRequestMock([
		{ status: 302, headers: { location: "/library.m3u" } },
		{ status: 200, headers: {} },
	]);
	try {
		const response = await safeFetch(START, {
			headers: { Authorization: AUTH },
		});
		assert.equal(response.status, 200);
		assert.equal(mock.calls[1]?.hostname, "playlist.example");
		assert.equal(mock.calls[1]?.path, "/library.m3u");
		assert.equal(authorizationOf(mock.calls[1]?.headers ?? {}), AUTH);
	} finally {
		mock.restore();
	}
});

test("safeFetch keeps Authorization when the redirect only spells the default port", async () => {
	const mock = installRequestMock([
		{
			status: 302,
			headers: { location: "https://playlist.example:443/library.m3u" },
		},
		{ status: 200, headers: {} },
	]);
	try {
		await safeFetch(START, { headers: { Authorization: AUTH } });
		assert.equal(authorizationOf(mock.calls[1]?.headers ?? {}), AUTH);
	} finally {
		mock.restore();
	}
});

test("safeStream drops Authorization on a cross-origin redirect and keeps Range", async () => {
	const mock = installRequestMock([
		{ status: 302, headers: { location: "//cdn.example/live.ts" } },
		{ status: 200, headers: { "content-type": "video/mp2t" } },
	]);
	try {
		const response = await safeStream(START, {
			headers: { Authorization: AUTH, range: "bytes=0-1" },
		});
		response.body.destroy();
		assert.equal(response.status, 200);
		assert.equal(mock.calls.length, 2);
		assert.equal(authorizationOf(mock.calls[0]?.headers ?? {}), AUTH);
		assert.equal(mock.calls[0]?.headers.range, "bytes=0-1");
		assert.equal(authorizationOf(mock.calls[1]?.headers ?? {}), undefined);
		assert.equal(mock.calls[1]?.headers.range, "bytes=0-1");
		assert.equal(mock.calls[1]?.hostname, "cdn.example");
	} finally {
		mock.restore();
	}
});

test("safeStream keeps Authorization and Range on a same-origin redirect", async () => {
	const mock = installRequestMock([
		{ status: 302, headers: { location: "segment.ts" } },
		{ status: 200, headers: { "content-type": "video/mp2t" } },
	]);
	try {
		const response = await safeStream(
			"https://playlist.example/live/index.m3u8",
			{
				headers: { authorization: AUTH, range: "bytes=0-1" },
			},
		);
		response.body.destroy();
		assert.equal(authorizationOf(mock.calls[1]?.headers ?? {}), AUTH);
		assert.equal(mock.calls[1]?.headers.range, "bytes=0-1");
		assert.equal(mock.calls[1]?.path, "/live/segment.ts");
	} finally {
		mock.restore();
	}
});
