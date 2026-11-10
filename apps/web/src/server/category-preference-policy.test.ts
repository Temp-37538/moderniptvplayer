import assert from "node:assert/strict";
import { test } from "node:test";
import {
	categoryTargetFromItemUrl,
	isAdultCategoryName,
	isCategorySetBlocked,
	isItemOpenFromCategory,
	matchesPreferenceScope,
	normalizeCategoryName,
	partitionCategories,
	preferenceScopeWhere,
	readEpisodeIds,
	unscopedPlaybackAllowed,
	type CategoryPreferenceRow,
	type CategoryScope,
} from "./category-preference-policy.ts";

const userA = "user-a";
const userB = "user-b";
const playlistA = "playlist-a";
const playlistB = "playlist-b";

function scope(
	userId: string,
	playlistId: string,
	kind: CategoryScope["kind"],
): CategoryScope {
	return { userId, playlistId, kind };
}

function row(
	partial: Partial<CategoryPreferenceRow> &
		Pick<
			CategoryPreferenceRow,
			"userId" | "playlistId" | "kind" | "categoryId"
		>,
): CategoryPreferenceRow {
	return {
		pinned: false,
		hidden: false,
		...partial,
	};
}

test("adult classification hits explicit category names and age marks", () => {
	const adult = [
		"XXX",
		"Adult",
		"Adults",
		"ADULT | US",
		"VOD | XXX",
		"+18",
		"18+",
		"18 plus",
		"plus 18",
		"[18+]",
		"21+",
		"Adultos",
		"Adulte",
		"Érotique",
		"Erótico",
		"Hentai",
		"Porn",
		"Porno",
		"NSFW",
		"OnlyFans",
		"MILF",
		"Hardcore",
		"Canal Sexy",
		"Sexy Movies",
		"Sex TV",
		"Sex",
		"FSK 18",
		"R18",
		"For Adults",
		"Adults Only",
		"Adult Swim XXX",
		"Dla dorosłych",
		"Yetişkin",
		"vod18+",
	];
	for (const name of adult) {
		assert.equal(isAdultCategoryName(name), true, name);
	}
});

test("adult classification covers French labels and adult brands", () => {
	const adult = [
		"FR | Films X",
		"Films X HD",
		"Canal X",
		"X Movies",
		"VOD X",
		"Films de sexe",
		"Sexe",
		"Films de charme",
		"Dorcel TV",
		"Playboy TV",
		"Hustler HD",
		"Penthouse",
		"Vivid",
		"Redlight HD",
		"Brazzers",
		"Bangbros",
		"Bang Bros",
		"Reality Kings",
		"Naughty America",
		"Pornhub",
		"xHamster",
		"Érotisme",
	];
	for (const name of adult) {
		assert.equal(isAdultCategoryName(name), true, name);
	}

	const safe = [
		"X",
		"X-Men",
		"Movies X-Men",
		"VOD | X-Men Collection",
		"Formula X TV",
		"X Factor",
		"Malcolm X",
		"Charmed",
		"Sexy Beasts",
		"Adult Swim",
		"America",
		"Kings",
	];
	for (const name of safe) {
		assert.equal(isAdultCategoryName(name), false, name);
	}
});

test("native script names stay allowed when normalization is empty", () => {
	const names = [
		"للكبار",
		"للبالغين",
		"для взрослых",
		"взрослые",
		"成人",
		"情色",
		"成人电影",
	];
	for (const name of names) {
		assert.equal(normalizeCategoryName(name), "", name);
		assert.equal(isAdultCategoryName(name), false, name);
	}
	assert.equal(isAdultCategoryName("成人 18+"), true);
	assert.equal(isAdultCategoryName("Adults"), true);
});

test("adult classification leaves ordinary and lookalike names alone", () => {
	const safe = [
		"Essex",
		"Middlesex",
		"Sussex",
		"Unisex",
		"Adult Swim",
		"Adult Swim HD",
		"Adult Contemporary",
		"Adult Hits",
		"Sex and the City",
		"Sexy Beasts",
		"Channel 18",
		"PG-18",
		"2018 Movies",
		"Sports",
		"News",
		"Kids",
		"Documentary",
		"Premium",
		"Private",
		"Hot Hits",
		"Romance",
		"",
	];
	for (const name of safe) {
		assert.equal(isAdultCategoryName(name), false, name);
	}
});

test("default preferences keep the provider order", () => {
	const categories = [
		{ id: "1", name: "News" },
		{ id: "2", name: "Sports" },
		{ id: "3", name: "Kids" },
	];
	const result = partitionCategories(
		categories,
		[],
		scope(userA, playlistA, "channel"),
		false,
	);
	assert.deepEqual(
		result.visible.map((category) => category.id),
		["1", "2", "3"],
	);
	assert.equal(result.hidden.length, 0);
	assert.equal(result.lockedAdultIds.length, 0);
	assert.equal(
		result.visible.every((category) => !category.pinned),
		true,
	);
});

test("pinned categories move ahead without dropping the others", () => {
	const categories = [
		{ id: "1", name: "News" },
		{ id: "2", name: "Sports" },
		{ id: "3", name: "Kids" },
	];
	const rows = [
		row({
			userId: userA,
			playlistId: playlistA,
			kind: "channel",
			categoryId: "3",
			pinned: true,
		}),
		row({
			userId: userA,
			playlistId: playlistA,
			kind: "channel",
			categoryId: "1",
			pinned: true,
		}),
	];
	const result = partitionCategories(
		categories,
		rows,
		scope(userA, playlistA, "channel"),
		false,
	);
	assert.deepEqual(
		result.visible.map((category) => category.id),
		["1", "3", "2"],
	);
});

test("hidden categories leave the visible list and keep their pin", () => {
	const categories = [
		{ id: "1", name: "News" },
		{ id: "2", name: "Sports" },
	];
	const rows = [
		row({
			userId: userA,
			playlistId: playlistA,
			kind: "channel",
			categoryId: "2",
			pinned: true,
			hidden: true,
		}),
	];
	const result = partitionCategories(
		categories,
		rows,
		scope(userA, playlistA, "channel"),
		false,
	);
	assert.deepEqual(
		result.visible.map((category) => category.id),
		["1"],
	);
	assert.equal(result.hidden[0]?.id, "2");
	assert.equal(result.hidden[0]?.pinned, true);
});

test("adult lock removes adult names and ignores pin and hide for those rows", () => {
	const categories = [
		{ id: "1", name: "News" },
		{ id: "2", name: "VOD | XXX" },
		{ id: "3", name: "Adult Swim" },
	];
	const rows = [
		row({
			userId: userA,
			playlistId: playlistA,
			kind: "movie",
			categoryId: "2",
			pinned: true,
		}),
	];
	const locked = partitionCategories(
		categories,
		rows,
		scope(userA, playlistA, "movie"),
		true,
	);
	assert.deepEqual(
		locked.visible.map((category) => category.name),
		["News", "Adult Swim"],
	);
	assert.deepEqual(locked.lockedAdultIds, ["2"]);
	assert.equal(locked.hidden.length, 0);

	const unlocked = partitionCategories(
		categories,
		rows,
		scope(userA, playlistA, "movie"),
		false,
	);
	assert.equal(unlocked.visible[0]?.id, "2");
	assert.equal(unlocked.lockedAdultIds.length, 0);
});

test("preferences are isolated by user, playlist, and kind", () => {
	const categories = [
		{ id: "9", name: "Sports" },
		{ id: "10", name: "News" },
	];
	const rows = [
		row({
			userId: userA,
			playlistId: playlistA,
			kind: "channel",
			categoryId: "9",
			hidden: true,
		}),
		row({
			userId: userB,
			playlistId: playlistA,
			kind: "channel",
			categoryId: "10",
			hidden: true,
		}),
		row({
			userId: userA,
			playlistId: playlistB,
			kind: "channel",
			categoryId: "10",
			hidden: true,
		}),
		row({
			userId: userA,
			playlistId: playlistA,
			kind: "movie",
			categoryId: "10",
			pinned: true,
		}),
	];
	const view = partitionCategories(
		categories,
		rows,
		scope(userA, playlistA, "channel"),
		false,
	);
	assert.deepEqual(
		view.visible.map((category) => category.id),
		["10"],
	);
	assert.equal(view.visible[0]?.pinned, false);
	assert.deepEqual(
		view.hidden.map((category) => category.id),
		["9"],
	);

	const otherUser = partitionCategories(
		categories,
		rows,
		scope(userB, playlistA, "channel"),
		false,
	);
	assert.deepEqual(
		otherUser.visible.map((category) => category.id),
		["9"],
	);

	const otherKind = partitionCategories(
		categories,
		rows,
		scope(userA, playlistA, "series"),
		false,
	);
	assert.deepEqual(
		otherKind.visible.map((category) => category.id),
		["9", "10"],
	);
});

test("scope filter matches the query fields and nothing else", () => {
	const where = preferenceScopeWhere(scope(userA, playlistA, "series"));
	assert.deepEqual(where, {
		userId: userA,
		playlistId: playlistA,
		kind: "series",
	});
	const matching = row({
		userId: userA,
		playlistId: playlistA,
		kind: "series",
		categoryId: "4",
		hidden: true,
	});
	assert.equal(
		matchesPreferenceScope(matching, scope(userA, playlistA, "series")),
		true,
	);
	assert.equal(
		matchesPreferenceScope(matching, scope(userB, playlistA, "series")),
		false,
	);
	assert.equal(
		matchesPreferenceScope(matching, scope(userA, playlistB, "series")),
		false,
	);
	assert.equal(
		matchesPreferenceScope(matching, scope(userA, playlistA, "channel")),
		false,
	);
});

test("server access blocks hidden ids and adult categories, not unknown extras", () => {
	const names = new Map([
		["sports", "Sports"],
		["xxx", "XXX Movies"],
	]);
	const hidden = new Set(["sports"]);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["sports"],
			namesById: names,
			hiddenIds: hidden,
			lockAdultCategories: false,
			requiredIds: new Set(["sports"]),
		}),
		true,
	);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["xxx"],
			namesById: names,
			hiddenIds: new Set(),
			lockAdultCategories: true,
			requiredIds: new Set(["xxx"]),
		}),
		true,
	);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["sports", "xxx"],
			namesById: names,
			hiddenIds: new Set(),
			lockAdultCategories: true,
			requiredIds: new Set(["sports"]),
		}),
		true,
	);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["missing"],
			namesById: names,
			hiddenIds: new Set(),
			lockAdultCategories: true,
			requiredIds: new Set(["missing"]),
		}),
		true,
	);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["sports", "missing"],
			namesById: names,
			hiddenIds: new Set(),
			lockAdultCategories: true,
			requiredIds: new Set(["sports"]),
		}),
		false,
	);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["news"],
			namesById: new Map([["news", "News"]]),
			hiddenIds: new Set(),
			lockAdultCategories: false,
			requiredIds: new Set(["news"]),
		}),
		false,
	);
});

test("episode membership follows the show payload", () => {
	const show = {
		seasons: [{ episodes: [{ id: "ep-1" }, { id: "ep-2" }] }, { episodes: [] }],
	};
	assert.deepEqual(readEpisodeIds(show), ["ep-1", "ep-2"]);
	assert.equal(readEpisodeIds(show).includes("ep-9"), false);
	assert.deepEqual(readEpisodeIds({}), []);
});

test("hidden blocks only the requested category and adult blocks every name", () => {
	const names = new Map([
		["drama", "Drama"],
		["sports", "Sports"],
		["xxx", "XXX Movies"],
		["native", "成人"],
	]);
	const hidden = new Set(["sports"]);
	assert.equal(
		isItemOpenFromCategory({
			requestedCategoryId: "drama",
			itemCategoryIds: ["sports", "drama"],
			namesById: names,
			hiddenIds: hidden,
			lockAdultCategories: false,
		}),
		true,
	);
	assert.equal(
		isCategorySetBlocked({
			categoryIds: ["drama", "sports"],
			namesById: names,
			hiddenIds: hidden,
			lockAdultCategories: false,
			requiredIds: new Set(["sports"]),
		}),
		true,
	);
	assert.equal(
		isItemOpenFromCategory({
			requestedCategoryId: "drama",
			itemCategoryIds: ["drama", "xxx"],
			namesById: names,
			hiddenIds: new Set(),
			lockAdultCategories: true,
		}),
		false,
	);
	assert.equal(
		isItemOpenFromCategory({
			requestedCategoryId: "drama",
			itemCategoryIds: ["sports", "native"],
			namesById: names,
			hiddenIds: hidden,
			lockAdultCategories: true,
		}),
		true,
	);
	assert.equal(
		isItemOpenFromCategory({
			requestedCategoryId: "xxx",
			itemCategoryIds: ["drama"],
			namesById: names,
			hiddenIds: new Set(),
			lockAdultCategories: true,
		}),
		false,
	);
});

test("saved item links keep playlist kind and category for later checks", () => {
	assert.deepEqual(
		categoryTargetFromItemUrl("/dashboard/movies/playlist-a/drama/movie-1"),
		{
			playlistId: "playlist-a",
			kind: "movie",
			categoryId: "drama",
			itemId: "movie-1",
		},
	);
	assert.deepEqual(
		categoryTargetFromItemUrl(
			"/dashboard/series/playlist-b/series-cat/show-9#episode-3",
		),
		{
			playlistId: "playlist-b",
			kind: "series",
			categoryId: "series-cat",
			itemId: "show-9",
		},
	);
	assert.deepEqual(
		categoryTargetFromItemUrl(
			"/dashboard/channels/playlist-a/live-1/channel-2",
		),
		{
			playlistId: "playlist-a",
			kind: "channel",
			categoryId: "live-1",
			itemId: "channel-2",
		},
	);
	assert.equal(
		categoryTargetFromItemUrl("/dashboard/favorites/playlist-a"),
		null,
	);
	assert.equal(
		categoryTargetFromItemUrl(
			"/dashboard/movies/playlist-a/drama/movie-1/extra",
		)?.itemId,
		"movie-1",
	);
});

test("playback without a category stays open until a restriction exists", () => {
	assert.equal(
		unscopedPlaybackAllowed({
			lockAdultCategories: false,
			hasHiddenCategory: false,
		}),
		true,
	);
	assert.equal(
		unscopedPlaybackAllowed({
			lockAdultCategories: true,
			hasHiddenCategory: false,
		}),
		false,
	);
	assert.equal(
		unscopedPlaybackAllowed({
			lockAdultCategories: false,
			hasHiddenCategory: true,
		}),
		false,
	);
});
