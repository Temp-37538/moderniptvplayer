import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { isCategorySetBlocked } from "./category-preference-policy.ts";

register(new URL("./vod-category-route-loader.mjs", import.meta.url).href, {
	parentURL: pathToFileURL(import.meta.dirname).href,
});

const routeSpecifier: string = new URL(
	"../app/api/stream/vod/[playlistId]/[kind]/[streamId]/route.ts",
	import.meta.url,
).href;

type RouteGet = (
	request: { nextUrl: URL },
	context: {
		params: Promise<{ playlistId: string; kind: string; streamId: string }>;
	},
) => Promise<Response>;

const { GET } = (await import(routeSpecifier)) as { GET: RouteGet };

const USER = "user-1";
const PLAYLIST = "playlist1";
const MOVIE = "movie1";
const SHOW = "show1";
const EPISODE = "episode1";
const HIDDEN = "hidden-h";
const VISIBLE = "visible-v";
const OTHER = "other-v";
const ADULT = "adult-a";

type PlaylistSource = "XTREAM" | "M3U";
type StreamKind = "movie" | "episode";

type CategoryCheck = {
	kind: string;
	categoryIds: string[];
	requiredIds: string[];
};

type RouteState = {
	userId: string;
	owned: boolean;
	lockAdult: boolean;
	hiddenIds: Set<string>;
	namesById: Map<string, string>;
	unscoped: boolean;
	allowCategory: (
		categoryIds: readonly string[],
		requiredIds: readonly string[],
	) => boolean;
	playlist: {
		id: string;
		source: PlaylistSource;
		serverUrl: string;
		username: string;
		password: string;
		playlistName: string;
		m3uUrl: string | null;
	} | null;
	movie: unknown;
	show: unknown;
	findCatalog: (kind: string, categoryId: string, itemId: string) => unknown;
	m3uTarget: { url: string; kind: string; delivery: string } | null;
	movieLoads: number;
	showLoads: number;
	catalogLoads: number;
	m3uCalls: number;
	xtreamClients: number;
	proxyCalls: Array<{ url: string; userId: string; manifest: boolean }>;
	streamUrls: Array<{ type: string; streamId: string; extension: string }>;
	categoryChecks: CategoryCheck[];
	showLoad: { showId?: string } | null;
	catalogLoad: { kind?: string; categoryId?: string; itemId?: string } | null;
};

type PlaybackKind = {
	label: string;
	article: "a" | "an";
	kind: StreamKind;
	accessKind: "movie" | "series";
	streamId: string;
	membershipId: string;
	show?: string;
	detail: (categoryIds: readonly string[]) => unknown;
	assign: (state: RouteState, detail: unknown) => void;
	loads: (state: RouteState) => number;
};

const playbackKinds: PlaybackKind[] = [
	{
		label: "film",
		article: "a",
		kind: "movie",
		accessKind: "movie",
		streamId: MOVIE,
		membershipId: MOVIE,
		detail: (categoryIds) => ({
			id: MOVIE,
			name: "Heat",
			categoryIds: [...categoryIds],
		}),
		assign: (state, detail) => {
			state.movie = detail;
		},
		loads: (state) => state.movieLoads,
	},
	{
		label: "episode",
		article: "an",
		kind: "episode",
		accessKind: "series",
		streamId: EPISODE,
		membershipId: SHOW,
		show: SHOW,
		detail: (categoryIds) => ({
			id: SHOW,
			name: "The Office",
			categoryIds: [...categoryIds],
			seasons: [{ episodes: [{ id: EPISODE }] }],
		}),
		assign: (state, detail) => {
			state.show = detail;
		},
		loads: (state) => state.showLoads,
	},
];

function installState(): RouteState {
	const state: RouteState = {
		userId: USER,
		owned: true,
		lockAdult: false,
		hiddenIds: new Set(),
		namesById: new Map([
			[HIDDEN, "Family"],
			[VISIBLE, "Action"],
			[OTHER, "Comedy"],
			[ADULT, "XXX Movies"],
		]),
		unscoped: true,
		allowCategory: () => true,
		playlist: playlist(),
		movie: null,
		show: null,
		findCatalog: () => null,
		m3uTarget: {
			url: "http://cdn.example/movie.mp4",
			kind: "movie",
			delivery: "file",
		},
		movieLoads: 0,
		showLoads: 0,
		catalogLoads: 0,
		m3uCalls: 0,
		xtreamClients: 0,
		proxyCalls: [],
		streamUrls: [],
		categoryChecks: [],
		showLoad: null,
		catalogLoad: null,
	};
	state.allowCategory = (categoryIds, requiredIds) => {
		if (!state.owned) {
			return false;
		}
		return !isCategorySetBlocked({
			categoryIds,
			namesById: state.namesById,
			hiddenIds: state.hiddenIds,
			lockAdultCategories: state.lockAdult,
			requiredIds: new Set(requiredIds),
		});
	};
	(
		globalThis as { __vodCategoryRouteTest?: RouteState }
	).__vodCategoryRouteTest = state;
	return state;
}

function restrict(state: RouteState) {
	state.unscoped =
		state.owned && !state.lockAdult && state.hiddenIds.size === 0;
}

function playlist(source: PlaylistSource = "XTREAM") {
	return {
		id: PLAYLIST,
		source,
		serverUrl: "http://playlist.example",
		username: "viewer",
		password: "secret",
		playlistName: "Home",
		m3uUrl: source === "M3U" ? "http://playlist.example/list.m3u" : null,
	};
}

function useDetail(
	state: RouteState,
	item: PlaybackKind,
	categoryIds: readonly string[],
) {
	item.assign(state, item.detail(categoryIds));
}

function forgetPlayback(state: RouteState) {
	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	state.m3uCalls = 0;
}

async function play(
	state: RouteState,
	input: {
		kind: StreamKind;
		streamId?: string;
		category?: string;
		show?: string;
	},
) {
	const streamId = input.streamId ?? (input.kind === "movie" ? MOVIE : EPISODE);
	const url = new URL(
		`http://localhost/api/stream/vod/${PLAYLIST}/${input.kind}/${streamId}`,
	);
	url.searchParams.set("ext", "mp4");
	if (input.category) {
		url.searchParams.set("category", input.category);
	}
	if (input.show) {
		url.searchParams.set("show", input.show);
	}
	const response = await GET(
		{ nextUrl: url },
		{
			params: Promise.resolve({
				playlistId: state.playlist?.id ?? PLAYLIST,
				kind: input.kind,
				streamId,
			}),
		},
	);
	const text = await response.text();
	assert.equal(text.includes("secret"), false);
	assert.equal(text.includes("playlist.example"), false);
	return { response, text };
}

function playItem(state: RouteState, item: PlaybackKind, category?: string) {
	return play(state, {
		kind: item.kind,
		streamId: item.streamId,
		category,
		show: item.show,
	});
}

function assertNoUpstream(state: RouteState) {
	assert.equal(state.proxyCalls.length, 0);
	assert.equal(state.streamUrls.length, 0);
	assert.equal(state.xtreamClients, 0);
	assert.equal(state.m3uCalls, 0);
}

function assertDenied(response: Response, text: string) {
	assert.equal(response.status, 404);
	assert.equal(JSON.parse(text).error, "Category not available.");
}

for (const item of playbackKinds) {
	test(`forged visible category is denied for ${item.article} ${item.label}`, async () => {
		const state = installState();
		state.hiddenIds = new Set([HIDDEN]);
		restrict(state);
		useDetail(state, item, [HIDDEN]);

		const { response, text } = await playItem(state, item, VISIBLE);

		assertDenied(response, text);
		assert.equal(item.loads(state), 1);
		assert.equal(state.catalogLoads, 0);
		if (item.kind === "episode") {
			assert.equal(state.showLoad?.showId, SHOW);
		}
		assertNoUpstream(state);
	});

	test(`${item.label} is not looked up when nothing is hidden or locked`, async () => {
		const state = installState();
		useDetail(state, item, [VISIBLE]);

		const { response } = await playItem(state, item, OTHER);

		assert.equal(response.status, 200);
		assert.equal(item.loads(state), 0);
		assert.equal(state.catalogLoads, 0);
		assert.equal(state.proxyCalls.length, 1);
	});

	test(`a lookup failure does not stop ${item.article} ${item.label} when nothing is hidden or locked`, async () => {
		const state = installState();
		item.assign(state, "throw");
		state.findCatalog = () => {
			throw new Error("listing unavailable");
		};

		const { response } = await playItem(state, item, VISIBLE);

		assert.equal(response.status, 200);
		assert.equal(state.catalogLoads, 0);
		assert.equal(state.proxyCalls.length, 1);
	});

	test(`cross-listed ${item.label} plays through the visible category only`, async () => {
		const state = installState();
		state.hiddenIds = new Set([HIDDEN]);
		state.lockAdult = true;
		restrict(state);
		useDetail(state, item, [HIDDEN, VISIBLE]);

		const allowed = await playItem(state, item, VISIBLE);
		assert.equal(allowed.response.status, 200);
		assert.equal(state.proxyCalls.length, 1);
		assert.deepEqual(state.streamUrls[0], {
			type: item.kind,
			streamId: item.streamId,
			extension: "mp4",
		});
		assert.equal(state.catalogLoads, 0);
		assert.ok(
			state.categoryChecks.some(
				(check) =>
					check.kind === item.accessKind &&
					check.categoryIds.includes(HIDDEN) &&
					check.categoryIds.includes(VISIBLE) &&
					check.requiredIds.length === 1 &&
					check.requiredIds[0] === VISIBLE,
			),
		);

		forgetPlayback(state);
		const denied = await playItem(state, item, HIDDEN);
		assertDenied(denied.response, denied.text);
		assertNoUpstream(state);
	});

	test(`adult lock sees every real ${item.label} category`, async () => {
		const state = installState();
		state.lockAdult = true;
		restrict(state);
		useDetail(state, item, [VISIBLE, ADULT]);

		const { response, text } = await playItem(state, item, VISIBLE);

		assertDenied(response, text);
		assert.ok(
			state.categoryChecks.some(
				(check) =>
					check.kind === item.accessKind && check.categoryIds.includes(ADULT),
			),
		);
		assertNoUpstream(state);
	});

	test(`hidden category denies ${item.article} ${item.label} before the title is loaded`, async () => {
		const state = installState();
		state.hiddenIds = new Set([HIDDEN]);
		restrict(state);
		useDetail(state, item, [HIDDEN]);

		const { response, text } = await playItem(state, item, HIDDEN);

		assertDenied(response, text);
		assert.equal(item.loads(state), 0);
		assert.equal(state.catalogLoads, 0);
		assertNoUpstream(state);
	});

	test(`an adult category denies ${item.article} ${item.label} before playback`, async () => {
		const state = installState();
		state.lockAdult = true;
		restrict(state);
		useDetail(state, item, [ADULT]);

		const { response, text } = await playItem(state, item, ADULT);

		assertDenied(response, text);
		assert.equal(item.loads(state), 0);
		assertNoUpstream(state);
	});

	test(`${item.label} without detail categories uses one category lookup`, async () => {
		const state = installState();
		state.hiddenIds = new Set([HIDDEN]);
		restrict(state);
		useDetail(state, item, []);
		state.findCatalog = () => ({
			id: item.membershipId,
			categoryId: VISIBLE,
		});

		const allowed = await playItem(state, item, VISIBLE);
		assert.equal(allowed.response.status, 200);
		assert.equal(state.catalogLoads, 1);
		assert.equal(state.catalogLoad?.kind, item.accessKind);
		assert.equal(state.catalogLoad?.categoryId, VISIBLE);
		assert.equal(state.catalogLoad?.itemId, item.membershipId);
		assert.equal(state.proxyCalls.length, 1);

		state.findCatalog = () => null;
		forgetPlayback(state);
		const denied = await playItem(state, item, VISIBLE);
		assertDenied(denied.response, denied.text);
		assertNoUpstream(state);
	});

	test(`listing row categories still reach the adult lock for ${item.article} ${item.label}`, async () => {
		const state = installState();
		state.lockAdult = true;
		restrict(state);
		useDetail(state, item, []);
		state.findCatalog = () => ({
			id: item.membershipId,
			categoryId: ADULT,
		});

		const denied = await playItem(state, item, VISIBLE);
		assertDenied(denied.response, denied.text);
		assert.ok(
			state.categoryChecks.some(
				(check) =>
					check.categoryIds.includes(ADULT) &&
					check.categoryIds.includes(VISIBLE),
			),
		);
		assertNoUpstream(state);

		state.lockAdult = false;
		restrict(state);
		forgetPlayback(state);
		state.categoryChecks = [];
		const allowed = await playItem(state, item, VISIBLE);
		assert.equal(allowed.response.status, 200);
		assert.equal(state.proxyCalls.length, 1);
	});
}

test("a movie detail failure uses the category lookup and fails closed", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	state.movie = "throw";
	state.findCatalog = () => ({ id: MOVIE, categoryIds: [VISIBLE] });

	const allowed = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.movieLoads, 1);
	assert.equal(state.proxyCalls.length, 1);

	const deniedState = installState();
	deniedState.hiddenIds = new Set([HIDDEN]);
	restrict(deniedState);
	deniedState.movie = "throw";
	deniedState.findCatalog = () => {
		throw new Error("listing unavailable");
	};
	const denied = await play(deniedState, { kind: "movie", category: VISIBLE });
	assertDenied(denied.response, denied.text);
	assertNoUpstream(deniedState);
});

test("episode that is not in the requested show is denied", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	state.show = {
		id: SHOW,
		categoryIds: [VISIBLE],
		seasons: [{ episodes: [{ id: "other-episode" }] }],
	};

	const { response, text } = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});

	assertDenied(response, text);
	assert.equal(state.catalogLoads, 0);
	assertNoUpstream(state);
});

test("episode category without a show id is denied", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	state.show = playbackKinds[1]?.detail([VISIBLE]);

	const { response, text } = await play(state, {
		kind: "episode",
		category: VISIBLE,
	});

	assertDenied(response, text);
	assert.equal(state.showLoads, 0);
	assertNoUpstream(state);
});

test("episode playback stops when the show detail cannot be read", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	state.show = "throw";
	state.findCatalog = () => ({ id: SHOW, categoryIds: [VISIBLE] });

	const { response, text } = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});

	assertDenied(response, text);
	assert.equal(state.catalogLoads, 0);
	assertNoUpstream(state);
});

test("another user's playlist never opens upstream", async () => {
	const state = installState();
	state.playlist = null;
	state.movie = playbackKinds[0]?.detail([VISIBLE]);

	const { response, text } = await play(state, {
		kind: "movie",
		category: VISIBLE,
	});

	assert.equal(response.status, 404);
	assert.equal(JSON.parse(text).error, "Playlist not found.");
	assert.equal(state.movieLoads, 0);
	assertNoUpstream(state);
});

test("category ownership failure does not open upstream", async () => {
	const state = installState();
	state.owned = false;
	restrict(state);
	state.movie = playbackKinds[0]?.detail([VISIBLE]);

	const { response, text } = await play(state, {
		kind: "movie",
		category: VISIBLE,
	});

	assertDenied(response, text);
	assert.equal(state.movieLoads, 0);
	assertNoUpstream(state);
});

test("unscoped playback without a category stays available", async () => {
	const state = installState();
	state.movie = playbackKinds[0]?.detail([HIDDEN]);

	const allowed = await play(state, { kind: "movie" });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.movieLoads, 0);
	assert.equal(state.proxyCalls.length, 1);
	assert.equal(state.xtreamClients, 1);

	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	forgetPlayback(state);
	const denied = await play(state, { kind: "movie" });
	assertDenied(denied.response, denied.text);
	assertNoUpstream(state);
});

test("M3U playback keeps category membership and does not build an Xtream URL", async () => {
	const state = installState();
	state.playlist = playlist("M3U");
	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	state.movie = playbackKinds[0]?.detail([VISIBLE]);
	state.m3uTarget = {
		url: "http://cdn.example/heat.mp4",
		kind: "movie",
		delivery: "file",
	};

	const allowed = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.m3uCalls, 1);
	assert.equal(state.xtreamClients, 0);
	assert.equal(state.streamUrls.length, 0);
	assert.equal(state.proxyCalls[0]?.url, "http://cdn.example/heat.mp4");
	assert.equal(state.proxyCalls[0]?.manifest, false);

	state.movie = playbackKinds[0]?.detail([HIDDEN]);
	state.hiddenIds = new Set([HIDDEN]);
	restrict(state);
	state.m3uCalls = 0;
	forgetPlayback(state);
	const denied = await play(state, { kind: "movie", category: VISIBLE });
	assertDenied(denied.response, denied.text);
	assert.equal(state.m3uCalls, 0);
	assertNoUpstream(state);
});
