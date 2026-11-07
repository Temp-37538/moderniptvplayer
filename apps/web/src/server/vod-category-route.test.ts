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

type CategoryCheck = {
	userId: string;
	playlistId: string;
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
	findMovie: (categoryId: string, movieId: string) => unknown;
	findShow: (categoryId: string, showId: string) => unknown;
	m3uTarget: { url: string; kind: string; delivery: string } | null;
	playlistLoads: number;
	movieLoads: number;
	showLoads: number;
	movieListLoads: number;
	showListLoads: number;
	m3uCalls: number;
	xtreamClients: number;
	proxyCalls: Array<{ url: string; userId: string; manifest: boolean }>;
	streamUrls: Array<{ type: string; streamId: string; extension: string }>;
	categoryChecks: CategoryCheck[];
	movieLoad: { movieId?: string } | null;
	showLoad: { showId?: string } | null;
	movieListLoad: { categoryId?: string; movieId?: string } | null;
	showListLoad: { categoryId?: string; showId?: string } | null;
};

function missingFromCategory() {
	return null;
}

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
		findMovie: missingFromCategory,
		findShow: missingFromCategory,
		m3uTarget: {
			url: "http://cdn.example/movie.mp4",
			kind: "movie",
			delivery: "file",
		},
		playlistLoads: 0,
		movieLoads: 0,
		showLoads: 0,
		movieListLoads: 0,
		showListLoads: 0,
		m3uCalls: 0,
		xtreamClients: 0,
		proxyCalls: [],
		streamUrls: [],
		categoryChecks: [],
		movieLoad: null,
		showLoad: null,
		movieListLoad: null,
		showListLoad: null,
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

function syncUnscoped(state: RouteState) {
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

function movieDetail(categoryIds: readonly string[]) {
	return { id: MOVIE, name: "Heat", categoryIds: [...categoryIds] };
}

function showDetail(
	categoryIds: readonly string[],
	episodeIds: readonly string[],
) {
	return {
		id: SHOW,
		name: "The Office",
		categoryIds: [...categoryIds],
		seasons: [{ episodes: episodeIds.map((id) => ({ id })) }],
	};
}

async function play(
	state: RouteState,
	input: {
		kind: "movie" | "episode";
		streamId?: string;
		category?: string;
		show?: string;
		ext?: string;
	},
) {
	const streamId = input.streamId ?? (input.kind === "movie" ? MOVIE : EPISODE);
	const url = new URL(
		`http://localhost/api/stream/vod/${PLAYLIST}/${input.kind}/${streamId}`,
	);
	url.searchParams.set("ext", input.ext ?? "mp4");
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

function assertNoUpstream(state: RouteState) {
	assert.equal(state.proxyCalls.length, 0);
	assert.equal(state.streamUrls.length, 0);
	assert.equal(state.xtreamClients, 0);
	assert.equal(state.m3uCalls, 0);
}

test("forged visible movie category is denied and does not open upstream", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	syncUnscoped(state);
	state.movie = movieDetail([HIDDEN]);

	const { response, text } = await play(state, {
		kind: "movie",
		category: VISIBLE,
	});

	assert.equal(response.status, 404);
	assert.equal(JSON.parse(text).error, "Category not available.");
	assert.equal(state.movieLoads, 1);
	assert.equal(state.movieListLoads, 0);
	assertNoUpstream(state);
});

test("forged visible episode category is denied for a real show", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	syncUnscoped(state);
	state.show = showDetail([HIDDEN], [EPISODE]);

	const { response, text } = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});

	assert.equal(response.status, 404);
	assert.equal(JSON.parse(text).error, "Category not available.");
	assert.equal(state.showLoads, 1);
	assert.equal(state.showLoad?.showId, SHOW);
	assert.equal(state.showListLoads, 0);
	assertNoUpstream(state);
});

test("forged category is denied when every category is visible", async () => {
	const state = installState();
	state.movie = movieDetail([VISIBLE]);

	const { response } = await play(state, { kind: "movie", category: OTHER });

	assert.equal(response.status, 404);
	assert.equal(state.movieListLoads, 0);
	assertNoUpstream(state);
});

test("cross-listed movie plays through the visible category only", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	state.lockAdult = true;
	syncUnscoped(state);
	state.movie = movieDetail([HIDDEN, VISIBLE]);

	const allowed = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.proxyCalls.length, 1);
	assert.equal(state.streamUrls.length, 1);
	assert.deepEqual(state.streamUrls[0], {
		type: "movie",
		streamId: MOVIE,
		extension: "mp4",
	});
	assert.equal(state.movieListLoads, 0);
	assert.ok(
		state.categoryChecks.some(
			(check) =>
				check.kind === "movie" &&
				check.categoryIds.includes(HIDDEN) &&
				check.categoryIds.includes(VISIBLE) &&
				check.requiredIds.length === 1 &&
				check.requiredIds[0] === VISIBLE,
		),
	);

	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	const denied = await play(state, { kind: "movie", category: HIDDEN });
	assert.equal(denied.response.status, 404);
	assert.equal(JSON.parse(denied.text).error, "Category not available.");
	assert.equal(state.proxyCalls.length, 0);
	assert.equal(state.streamUrls.length, 0);
	assert.equal(state.xtreamClients, 0);
});

test("cross-listed episode plays through the visible category only", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	syncUnscoped(state);
	state.show = showDetail([HIDDEN, VISIBLE], [EPISODE]);

	const allowed = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});
	assert.equal(allowed.response.status, 200);
	assert.deepEqual(state.streamUrls[0], {
		type: "episode",
		streamId: EPISODE,
		extension: "mp4",
	});
	assert.ok(
		state.categoryChecks.some(
			(check) =>
				check.kind === "series" &&
				check.categoryIds.includes(HIDDEN) &&
				check.categoryIds.includes(VISIBLE) &&
				check.requiredIds.length === 1 &&
				check.requiredIds[0] === VISIBLE,
		),
	);

	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	const denied = await play(state, {
		kind: "episode",
		category: HIDDEN,
		show: SHOW,
	});
	assert.equal(denied.response.status, 404);
	assert.equal(state.proxyCalls.length, 0);
	assert.equal(state.xtreamClients, 0);
});

test("episode that is not in the requested show is denied", async () => {
	const state = installState();
	state.show = showDetail([VISIBLE], ["other-episode"]);

	const { response } = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});

	assert.equal(response.status, 404);
	assert.equal(state.showListLoads, 0);
	assertNoUpstream(state);
});

test("episode category without a show id is denied", async () => {
	const state = installState();
	state.show = showDetail([VISIBLE], [EPISODE]);

	const { response } = await play(state, {
		kind: "episode",
		category: VISIBLE,
	});

	assert.equal(response.status, 404);
	assert.equal(state.showLoads, 0);
	assertNoUpstream(state);
});

test("hidden category is denied before the title is loaded", async () => {
	const state = installState();
	state.hiddenIds = new Set([HIDDEN]);
	syncUnscoped(state);
	state.movie = movieDetail([HIDDEN]);

	const { response } = await play(state, { kind: "movie", category: HIDDEN });

	assert.equal(response.status, 404);
	assert.equal(state.movieLoads, 0);
	assertNoUpstream(state);
});

test("adult lock still sees every real movie category", async () => {
	const state = installState();
	state.lockAdult = true;
	syncUnscoped(state);
	state.movie = movieDetail([VISIBLE, ADULT]);

	const { response } = await play(state, { kind: "movie", category: VISIBLE });

	assert.equal(response.status, 404);
	assert.ok(
		state.categoryChecks.some((check) => check.categoryIds.includes(ADULT)),
	);
	assertNoUpstream(state);
});

test("adult lock still sees every real show category", async () => {
	const state = installState();
	state.lockAdult = true;
	syncUnscoped(state);
	state.show = showDetail([VISIBLE, ADULT], [EPISODE]);

	const { response } = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});

	assert.equal(response.status, 404);
	assert.ok(
		state.categoryChecks.some(
			(check) => check.kind === "series" && check.categoryIds.includes(ADULT),
		),
	);
	assertNoUpstream(state);
});

test("requesting an adult category is denied before playback", async () => {
	const state = installState();
	state.lockAdult = true;
	syncUnscoped(state);
	state.movie = movieDetail([ADULT]);

	const { response } = await play(state, { kind: "movie", category: ADULT });

	assert.equal(response.status, 404);
	assert.equal(state.movieLoads, 0);
	assertNoUpstream(state);
});

test("movie detail without categories can be proved by one category lookup", async () => {
	const state = installState();
	state.movie = { id: MOVIE, name: "Heat" };
	state.findMovie = () => ({ id: MOVIE, categoryId: VISIBLE });

	const allowed = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.movieListLoads, 1);
	assert.equal(state.movieListLoad?.categoryId, VISIBLE);
	assert.equal(state.movieListLoad?.movieId, MOVIE);
	assert.equal(state.proxyCalls.length, 1);

	state.findMovie = () => null;
	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	const denied = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(denied.response.status, 404);
	assertNoUpstream(state);
});

test("a detail failure falls back to the category lookup and fails closed", async () => {
	const state = installState();
	state.movie = "throw";
	state.findMovie = () => ({ id: MOVIE, categoryIds: [VISIBLE] });

	const allowed = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.movieLoads, 1);
	assert.equal(state.proxyCalls.length, 1);

	const deniedState = installState();
	deniedState.movie = "throw";
	deniedState.findMovie = () => {
		throw new Error("listing unavailable");
	};
	const denied = await play(deniedState, {
		kind: "movie",
		category: VISIBLE,
	});
	assert.equal(denied.response.status, 404);
	assertNoUpstream(deniedState);
});

test("listing rows still supply sibling categories to the adult lock", async () => {
	const state = installState();
	state.lockAdult = true;
	syncUnscoped(state);
	state.movie = { id: MOVIE, name: "Heat" };
	state.findMovie = () => ({ id: MOVIE, categoryId: ADULT });

	const denied = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(denied.response.status, 404);
	assert.ok(
		state.categoryChecks.some(
			(check) =>
				check.categoryIds.includes(ADULT) &&
				check.categoryIds.includes(VISIBLE),
		),
	);
	assertNoUpstream(state);

	state.lockAdult = false;
	syncUnscoped(state);
	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	state.categoryChecks = [];
	const allowed = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.proxyCalls.length, 1);
});

test("episode without detail categories uses the show category lookup", async () => {
	const state = installState();
	state.show = showDetail([], [EPISODE]);
	state.findShow = () => ({ id: SHOW, categoryIds: [VISIBLE] });

	const allowed = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});
	assert.equal(allowed.response.status, 200);
	assert.equal(state.showListLoads, 1);
	assert.equal(state.showListLoad?.categoryId, VISIBLE);
	assert.equal(state.showListLoad?.showId, SHOW);
	assert.equal(state.proxyCalls.length, 1);

	state.findShow = () => null;
	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	const denied = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});
	assert.equal(denied.response.status, 404);
	assert.equal(state.proxyCalls.length, 0);
	assert.equal(state.xtreamClients, 0);
});

test("episode playback stops when the show detail cannot be read", async () => {
	const state = installState();
	state.show = "throw";
	state.findShow = () => ({ id: SHOW, categoryIds: [VISIBLE] });

	const { response } = await play(state, {
		kind: "episode",
		category: VISIBLE,
		show: SHOW,
	});

	assert.equal(response.status, 404);
	assert.equal(state.showListLoads, 0);
	assertNoUpstream(state);
});

test("another user's playlist never opens upstream", async () => {
	const state = installState();
	state.playlist = null;
	state.movie = movieDetail([VISIBLE]);

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
	syncUnscoped(state);
	state.movie = movieDetail([VISIBLE]);

	const { response } = await play(state, { kind: "movie", category: VISIBLE });

	assert.equal(response.status, 404);
	assert.equal(state.movieLoads, 0);
	assertNoUpstream(state);
});

test("unscoped playback without a category stays available", async () => {
	const state = installState();
	state.movie = movieDetail([HIDDEN]);

	const allowed = await play(state, { kind: "movie" });
	assert.equal(allowed.response.status, 200);
	assert.equal(state.movieLoads, 0);
	assert.equal(state.proxyCalls.length, 1);
	assert.equal(state.xtreamClients, 1);

	state.hiddenIds = new Set([HIDDEN]);
	syncUnscoped(state);
	state.proxyCalls = [];
	state.streamUrls = [];
	state.xtreamClients = 0;
	const denied = await play(state, { kind: "movie" });
	assert.equal(denied.response.status, 404);
	assert.equal(JSON.parse(denied.text).error, "Category not available.");
	assertNoUpstream(state);
});

test("M3U playback keeps category membership and does not build an Xtream URL", async () => {
	const state = installState();
	state.playlist = playlist("M3U");
	state.movie = movieDetail([VISIBLE]);
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

	state.movie = movieDetail([HIDDEN]);
	state.hiddenIds = new Set([HIDDEN]);
	syncUnscoped(state);
	state.m3uCalls = 0;
	state.proxyCalls = [];
	const denied = await play(state, { kind: "movie", category: VISIBLE });
	assert.equal(denied.response.status, 404);
	assert.equal(state.m3uCalls, 0);
	assertNoUpstream(state);
});
