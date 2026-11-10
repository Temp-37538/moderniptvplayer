import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";
import { pathToFileURL } from "node:url";
import { SYNC_FUNCTION_MAX_MS } from "./catalog-index-policy.ts";

register(new URL("./search-route-loader.mjs", import.meta.url).href, {
	parentURL: pathToFileURL(import.meta.dirname).href,
});

const routeSpecifier: string = new URL(
	"../app/api/search/route.ts",
	import.meta.url,
).href;

type RouteGet = (request: { nextUrl: URL }) => Promise<Response>;

const { GET, maxDuration } = (await import(routeSpecifier)) as {
	GET: RouteGet;
	maxDuration: number;
};

const USER = "user-1";
const PLAYLIST = "playlist1";

type Kind = "channel" | "movie" | "series";
type KindSets = Record<Kind, ReadonlySet<string>>;

type SearchInput = {
	playlistId: string;
	activeSyncId: string;
	tokens: readonly string[];
	kinds: readonly Kind[];
	limit: number;
	hidden: KindSets;
	adult: KindSets;
};

type SearchResult = {
	kind: Kind;
	id: string;
	name: string;
	image: string | null;
	categoryId: string;
};

type RouteState = {
	userId: string;
	rateLimit: { allowed: boolean; retryAfterSeconds: number };
	playlist: { id: string } | null;
	playlistError: Error | null;
	rules: { hidden: KindSets; adult: KindSets } | null;
	catalog: {
		status: "ready" | "building" | "unavailable";
		stale: boolean;
		syncedAt: Date | null;
		activeSyncId: string | null;
		start: boolean;
		retryAfterMs: number;
	};
	searchError: Error | null;
	searchResults: (input: SearchInput) => SearchResult[];
	afterTasks: Array<() => unknown>;
	rateLimitCalls: Array<{ key: string; limit: number; windowMs: number }>;
	rulesLoads: string[];
	ensureCalls: Array<{ userId: string; playlistId: string; trigger: string }>;
	syncCalls: Array<{ userId: string; playlistId: string }>;
	searchCalls: SearchInput[];
};

const SYNCED_AT = new Date("2026-11-09T20:00:00.000Z");

function kindSets(ids: Partial<Record<Kind, string[]>> = {}): KindSets {
	return {
		channel: new Set(ids.channel ?? []),
		movie: new Set(ids.movie ?? []),
		series: new Set(ids.series ?? []),
	};
}

function installState(): RouteState {
	const state: RouteState = {
		userId: USER,
		rateLimit: { allowed: true, retryAfterSeconds: 0 },
		playlist: { id: PLAYLIST },
		playlistError: null,
		rules: { hidden: kindSets(), adult: kindSets() },
		catalog: {
			status: "ready",
			stale: false,
			syncedAt: SYNCED_AT,
			activeSyncId: "sync-1",
			start: false,
			retryAfterMs: 0,
		},
		searchError: null,
		searchResults: () => [],
		afterTasks: [],
		rateLimitCalls: [],
		rulesLoads: [],
		ensureCalls: [],
		syncCalls: [],
		searchCalls: [],
	};
	(globalThis as { __searchRouteTest?: RouteState }).__searchRouteTest = state;
	return state;
}

async function search(params: Record<string, string>) {
	const url = new URL("http://localhost/api/search");
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	const response = await GET({ nextUrl: url });
	const body = (await response.json()) as Record<string, unknown>;
	return { response, body };
}

function assertNoCatalogWork(state: RouteState) {
	assert.equal(state.ensureCalls.length, 0);
	assert.equal(state.searchCalls.length, 0);
	assert.equal(state.afterTasks.length, 0);
}

test("invalid parameters are rejected with 400", async () => {
	const cases: Array<Record<string, string>> = [
		{ q: "matrix" },
		{ playlistId: "bad/id", q: "matrix" },
		{ playlistId: PLAYLIST, q: "a" },
		{ playlistId: PLAYLIST, q: "x".repeat(65) },
		{ playlistId: PLAYLIST, q: "matrix", kind: "music" },
		{ playlistId: PLAYLIST, q: "matrix", limit: "0" },
		{ playlistId: PLAYLIST, q: "matrix", limit: "31" },
		{ playlistId: PLAYLIST, q: "matrix", retry: "true" },
	];
	for (const params of cases) {
		const state = installState();
		const { response, body } = await search(params);
		assert.equal(response.status, 400, JSON.stringify(params));
		assert.deepEqual(body, { error: "Invalid search parameters." });
		assert.equal(state.rateLimitCalls.length, 0);
		assertNoCatalogWork(state);
	}
});

test("a query without usable tokens is rejected with 400", async () => {
	for (const q of ["!!!", "- -", "a ."]) {
		const state = installState();
		const { response, body } = await search({ playlistId: PLAYLIST, q });
		assert.equal(response.status, 400, q);
		assert.deepEqual(body, { error: "Invalid search query." });
		assertNoCatalogWork(state);
	}
});

test("the per-user rate limit answers 429 with Retry-After", async () => {
	const state = installState();
	state.rateLimit = { allowed: false, retryAfterSeconds: 17 };

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 429);
	assert.equal(response.headers.get("Retry-After"), "17");
	assert.deepEqual(body, { error: "Too many search requests." });
	assert.deepEqual(state.rateLimitCalls, [
		{ key: `catalog-search:${USER}`, limit: 30, windowMs: 60_000 },
	]);
	assert.equal(state.rulesLoads.length, 0);
	assertNoCatalogWork(state);
});

test("a playlist the user cannot read answers 404", async () => {
	const state = installState();
	state.playlist = null;

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 404);
	assert.deepEqual(body, { error: "Playlist not found." });
	assert.equal(state.rulesLoads.length, 0);
	assertNoCatalogWork(state);
});

test("missing category rules answer 404", async () => {
	const state = installState();
	state.rules = null;

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 404);
	assert.deepEqual(body, { error: "Playlist not found." });
	assert.deepEqual(state.rulesLoads, [PLAYLIST]);
	assertNoCatalogWork(state);
});

test("a catalogue being built answers 202 and schedules one sync", async () => {
	const state = installState();
	state.catalog = {
		status: "building",
		stale: false,
		syncedAt: null,
		activeSyncId: null,
		start: true,
		retryAfterMs: 0,
	};

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 202);
	assert.deepEqual(body, {
		status: "building",
		stale: false,
		syncedAt: null,
		results: [],
	});
	assert.deepEqual(state.ensureCalls, [
		{ userId: USER, playlistId: PLAYLIST, trigger: "auto" },
	]);
	assert.equal(state.searchCalls.length, 0);
	assert.equal(state.afterTasks.length, 1);
	assert.equal(state.syncCalls.length, 0, "the sync runs after the response");

	await state.afterTasks[0]?.();
	assert.deepEqual(state.syncCalls, [{ userId: USER, playlistId: PLAYLIST }]);
});

test("a build already in progress is not scheduled again", async () => {
	const state = installState();
	state.catalog = {
		status: "building",
		stale: false,
		syncedAt: null,
		activeSyncId: null,
		start: false,
		retryAfterMs: 0,
	};

	const { response } = await search({ playlistId: PLAYLIST, q: "matrix" });
	assert.equal(response.status, 202);
	assert.equal(state.afterTasks.length, 0);
});

test("an unavailable catalogue answers 503", async () => {
	const state = installState();
	state.catalog = {
		status: "unavailable",
		stale: false,
		syncedAt: null,
		activeSyncId: null,
		start: false,
		retryAfterMs: 0,
	};

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 503);
	assert.deepEqual(body, {
		status: "unavailable",
		stale: false,
		syncedAt: null,
		results: [],
		retryAfter: 0,
	});
	assert.equal(response.headers.get("Retry-After"), null);
	assert.equal(state.searchCalls.length, 0);
	assert.equal(state.afterTasks.length, 0);
});

test("an unavailable catalogue reports when it can be retried", async () => {
	const state = installState();
	state.catalog = {
		status: "unavailable",
		stale: false,
		syncedAt: null,
		activeSyncId: null,
		start: false,
		retryAfterMs: 125_400,
	};

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 503);
	assert.equal(body.retryAfter, 126);
	assert.equal(response.headers.get("Retry-After"), "126");
});

test("retry=1 asks the catalogue for an explicit retry", async () => {
	const state = installState();
	state.catalog = {
		status: "building",
		stale: false,
		syncedAt: null,
		activeSyncId: null,
		start: true,
		retryAfterMs: 0,
	};

	const { response } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
		retry: "1",
	});
	assert.equal(response.status, 202);
	assert.deepEqual(state.ensureCalls, [
		{ userId: USER, playlistId: PLAYLIST, trigger: "retry" },
	]);
	assert.equal(state.afterTasks.length, 1);
});

test("the route may run as long as the sync it schedules", () => {
	assert.equal(maxDuration * 1000, SYNC_FUNCTION_MAX_MS);
});

test("a ready state without an active generation answers 503", async () => {
	const state = installState();
	state.catalog = { ...state.catalog, activeSyncId: null };

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 503);
	assert.equal(body.status, "unavailable");
	assert.equal(body.syncedAt, SYNCED_AT.toISOString());
	assert.equal(state.searchCalls.length, 0);
});

test("a ready catalogue answers 200 with results and encoded hrefs", async () => {
	const state = installState();
	state.searchResults = () => [
		{
			kind: "movie",
			id: "m1",
			name: "The Matrix",
			image: "https://img.example/m1.jpg",
			categoryId: "cat 1",
		},
		{ kind: "series", id: "s1", name: "Matrix", image: null, categoryId: "c2" },
		{
			kind: "channel",
			id: "ch1",
			name: "Matrix TV",
			image: null,
			categoryId: "c3",
		},
	];

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "  The MATRIX ",
		limit: "5",
	});
	assert.equal(response.status, 200);
	assert.deepEqual(body, {
		status: "ready",
		stale: false,
		syncedAt: SYNCED_AT.toISOString(),
		results: [
			{
				kind: "movie",
				id: "m1",
				name: "The Matrix",
				image: "https://img.example/m1.jpg",
				categoryId: "cat 1",
				href: `/dashboard/movies/${PLAYLIST}/cat%201/m1`,
			},
			{
				kind: "series",
				id: "s1",
				name: "Matrix",
				image: null,
				categoryId: "c2",
				href: `/dashboard/series/${PLAYLIST}/c2/s1`,
			},
			{
				kind: "channel",
				id: "ch1",
				name: "Matrix TV",
				image: null,
				categoryId: "c3",
				href: `/dashboard/channels/${PLAYLIST}/c3/ch1`,
			},
		],
	});

	const call = state.searchCalls[0];
	assert.ok(call);
	assert.equal(call.playlistId, PLAYLIST);
	assert.equal(call.activeSyncId, "sync-1");
	assert.deepEqual(call.tokens, ["the", "matrix"]);
	assert.equal(call.limit, 5);
});

test("a stale ready catalogue still answers and refreshes in the background", async () => {
	const state = installState();
	state.catalog = { ...state.catalog, stale: true, start: true };

	const { response, body } = await search({
		playlistId: PLAYLIST,
		q: "matrix",
	});
	assert.equal(response.status, 200);
	assert.equal(body.stale, true);
	assert.equal(state.searchCalls.length, 1);
	assert.equal(state.afterTasks.length, 1);
});

test("hidden and adult category sets reach the search unchanged", async () => {
	const state = installState();
	const rules = {
		hidden: kindSets({ movie: ["hidden-h"], channel: ["hidden-c"] }),
		adult: kindSets({ movie: ["adult-a"], series: ["adult-s"] }),
	};
	state.rules = rules;

	await search({ playlistId: PLAYLIST, q: "matrix" });
	const call = state.searchCalls[0];
	assert.ok(call);
	assert.equal(call.hidden, rules.hidden);
	assert.equal(call.adult, rules.adult);
});

test("kind=all searches every kind and a single kind searches only that one", async () => {
	const all = installState();
	await search({ playlistId: PLAYLIST, q: "matrix" });
	assert.deepEqual(all.searchCalls[0]?.kinds, ["channel", "movie", "series"]);
	assert.equal(all.searchCalls[0]?.limit, 20);

	const explicitAll = installState();
	await search({ playlistId: PLAYLIST, q: "matrix", kind: "all" });
	assert.deepEqual(explicitAll.searchCalls[0]?.kinds, [
		"channel",
		"movie",
		"series",
	]);

	for (const kind of ["channel", "movie", "series"] as const) {
		const single = installState();
		await search({ playlistId: PLAYLIST, q: "matrix", kind });
		assert.deepEqual(single.searchCalls[0]?.kinds, [kind]);
	}
});

test("an unexpected failure answers 500 without leaking details", async () => {
	const state = installState();
	const secret = "postgres://user:hunter2@db.internal/catalog";
	state.searchError = new TypeError(`connection failed: ${secret}`);
	const logged = mock.method(console, "error", () => {});

	try {
		const { response, body } = await search({
			playlistId: PLAYLIST,
			q: "matrix",
		});
		assert.equal(response.status, 500);
		assert.deepEqual(body, {
			error: "Unable to search the catalogue right now.",
		});
		assert.equal(JSON.stringify(body).includes("hunter2"), false);
		assert.equal(logged.mock.callCount(), 1);
		const args = logged.mock.calls[0]?.arguments ?? [];
		assert.deepEqual(args, ["[catalog-search] failed:", "TypeError"]);
	} finally {
		logged.mock.restore();
	}
});

test("a failing playlist lookup also answers 500", async () => {
	const state = installState();
	state.playlistError = new Error("decrypt key mismatch");
	const logged = mock.method(console, "error", () => {});

	try {
		const { response, body } = await search({
			playlistId: PLAYLIST,
			q: "matrix",
		});
		assert.equal(response.status, 500);
		assert.equal(JSON.stringify(body).includes("decrypt"), false);
	} finally {
		logged.mock.restore();
	}
});
