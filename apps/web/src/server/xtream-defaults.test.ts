import assert from "node:assert/strict";
import { test } from "node:test";
import { standardizedSerializer } from "@iptv/xtream-api/standardized";
import { fillSerializerDefaults } from "./xtream-defaults.ts";

const serializers = standardizedSerializer.serializers as Record<
	string,
	(input: unknown) => unknown
>;
const serialize = (key: string, value: unknown) =>
	serializers[key]?.(fillSerializerDefaults(key, value));

test("a movie without category ids, backdrops or tmdb id serializes", () => {
	const movie = serialize("movie", {
		info: { name: "Bare movie", plot: "" },
		movie_data: { stream_id: 7, category_id: "3", added: "0" },
	}) as { id: string; categoryIds: string[]; tmdbId: string };
	assert.equal(movie.id, "7");
	assert.deepEqual(movie.categoryIds, ["3"]);
	assert.equal(movie.tmdbId, "");
});

test("a movie whose info is an empty array still serializes", () => {
	const movie = serialize("movie", {
		info: [],
		movie_data: { stream_id: 8, category_ids: [1, 2] },
	}) as { categoryIds: string[] };
	assert.deepEqual(movie.categoryIds, ["1", "2"]);
});

test("list items get category ids from their single category", () => {
	const items = serialize("movies", [
		{ stream_id: 1, category_id: "4", backdrop_path: "x.jpg" },
		{ stream_id: 2 },
	]) as Array<{ categoryIds: string[] }>;
	assert.deepEqual(
		items.map((item) => item.categoryIds),
		[["4"], []],
	);
	const shows = serialize("shows", [{ series_id: 3 }]) as Array<{
		cover: unknown;
	}>;
	assert.equal(shows[0]?.cover, undefined);
	const channels = serialize("channels", [
		{ stream_id: 4, category_id: "1" },
	]) as Array<{ categoryIds: string[] }>;
	assert.deepEqual(channels[0]?.categoryIds, ["1"]);
});

test("a show with sparse episodes and an empty season serializes", () => {
	const show = serialize("show", {
		info: { series_id: 9, name: "Show" },
		episodes: {
			"1": [{ id: "11", episode_num: 1 }, null],
			"2": [],
		},
	}) as { seasons: Array<{ id: string; episodes: unknown[] }> };
	assert.deepEqual(
		show.seasons.map((season) => [season.id, season.episodes.length]),
		[["1", 1]],
	);
});

test("a show with no episodes at all has no seasons", () => {
	const show = serialize("show", {
		info: { series_id: 10 },
		episodes: [],
	}) as { seasons: unknown[] };
	assert.deepEqual(show.seasons, []);
});

test("values for other serializers pass through untouched", () => {
	const value = { user_info: {} };
	assert.equal(fillSerializerDefaults("profile", value), value);
});
