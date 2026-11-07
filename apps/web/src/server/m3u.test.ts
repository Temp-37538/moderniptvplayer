import assert from "node:assert/strict";
import test from "node:test";
import { xtreamIdentityKey } from "./playlist-identity.ts";
import { stripUrlUserinfo } from "./safe-http.ts";
import {
	classifyEntry,
	findM3uStream,
	m3uCategoryId,
	m3uItemId,
	parseM3uPlaylist,
	parseM3uUrl,
} from "./m3u.ts";

const SAMPLE = `#EXTM3U
#EXTINF:-1 tvg-id="news.1" tvg-logo="https://cdn.example/news.png" group-title="News",World News
http://cdn.example/live/news.ts
#EXTINF:-1 group-title="News",Local News
https://user:secret@cdn.example/live/local.m3u8
#EXTINF:-1 group-title="Action Movies",Die Hard
http://cdn.example/vod/die-hard.mkv
#EXTINF:-1 tvg-type="movie" group-title="Action Movies",Heat
http://cdn.example/files/heat
#EXTINF:-1 group-title="Drama",The Office S01E01 - Pilot
http://cdn.example/series/office-s01e01.mp4
#EXTINF:-1 group-title="Drama",The Office S01E02
http://cdn.example/series/office-s01e02.mp4
#EXTINF:-1 group-title="Drama",The Office S02E01
http://cdn.example/series/office-s02e01.mp4
#EXTINF:-1 group-title="Kids",Cartoon 1x02
http://cdn.example/series/cartoon.mp4
#EXTINF:-1 group-title="Broken",Skip me
file:///etc/passwd
not a url
`;

test("canonical M3U identity ignores userinfo and hash, and keeps the query token", () => {
	const withUser = parseM3uUrl(
		"https://User:s3cret@CDN.Example:443/get.php?username=a&password=b#frag",
	);
	const withoutUser = parseM3uUrl(
		"http://cdn.example/get.php?password=b&username=a",
	);
	assert.equal(withUser.origin, "https://cdn.example");
	assert.equal(withUser.canonical.includes("s3cret"), false);
	assert.equal(withUser.canonical.includes("User"), false);
	assert.equal(withUser.storedUrl.includes("s3cret"), true);
	assert.notEqual(withUser.identityKey, withoutUser.identityKey);
	assert.equal(
		parseM3uUrl("https://cdn.example/get.php?password=b&username=a")
			.identityKey,
		withUser.identityKey,
	);
	assert.equal(
		withUser.identityKey,
		parseM3uUrl(withUser.storedUrl).identityKey,
	);
});

test("M3U category ids are stable, kind-specific, and not Xtream numeric ids", () => {
	const live = m3uCategoryId("live", " News ");
	const movie = m3uCategoryId("movie", "news");
	const series = m3uCategoryId("series", "News");
	assert.equal(live, m3uCategoryId("live", "news"));
	assert.notEqual(live, movie);
	assert.notEqual(movie, series);
	assert.notEqual(live, "12");
	assert.match(live, /^m3ul[a-f0-9]{20}$/);
	assert.match(movie, /^m3um[a-f0-9]{20}$/);
	assert.match(series, /^m3us[a-f0-9]{20}$/);
	for (const id of [live, movie, series]) {
		assert.equal(/^\d+$/.test(id), false);
		assert.ok(id.length <= 128);
		assert.equal(id.includes("/"), false);
	}
});

test("item ids stay inside the stream id pattern and ignore userinfo", () => {
	const left = m3uItemId("https://user:pw@cdn.example/a.mp4?token=1");
	const right = m3uItemId("https://cdn.example/a.mp4?token=1");
	assert.equal(left, right);
	assert.match(left, /^i[a-f0-9]{24}$/);
	assert.notEqual(left, m3uItemId("https://cdn.example/a.mp4?token=2"));
});

test("parser builds live, movie, and series categories without unsafe URLs", () => {
	const parsed = parseM3uPlaylist(SAMPLE);
	const liveNews = m3uCategoryId("live", "News");
	const movies = m3uCategoryId("movie", "Action Movies");
	const drama = m3uCategoryId("series", "Drama");
	assert.deepEqual(
		parsed.categories
			.filter((category) => category.kind === "live")
			.map((c) => c.id),
		[liveNews],
	);
	assert.equal(parsed.live.length, 2);
	assert.equal(parsed.live[0]?.categoryId, liveNews);
	assert.equal(parsed.live[0]?.epgId, "news.1");
	assert.equal(parsed.live[0]?.number, 1);
	assert.equal(parsed.live[1]?.delivery, "hls");
	assert.equal(parsed.movies.length, 2);
	assert.equal(parsed.movies[0]?.categoryId, movies);
	assert.equal(parsed.movies[0]?.extension, "mkv");
	assert.equal(parsed.shows.length, 2);
	const office = parsed.shows.find((show) => show.name === "The Office");
	assert.ok(office);
	assert.deepEqual(office?.categoryIds, [drama]);
	assert.deepEqual(
		office?.episodes.map((episode) => [episode.seasonNumber, episode.number]),
		[
			[1, 1],
			[1, 2],
			[2, 1],
		],
	);
	assert.equal(office?.episodes[0]?.title, "Pilot");
	const cartoon = parsed.shows.find((show) => show.name === "Cartoon");
	assert.equal(cartoon?.episodes[0]?.number, 2);
	assert.equal(
		findM3uStream(parsed, office?.episodes[1]?.id ?? "")?.kind,
		"series",
	);
	assert.equal(
		parsed.live.some((entry) => entry.url.startsWith("file:")),
		false,
	);
});

test("classification prefers an episode code over a movie file extension", () => {
	const episode = classifyEntry({
		title: "Show S01E03",
		group: "Movies",
		url: "http://cdn.example/show.mp4",
		attrs: new Map(),
	});
	assert.equal(episode.kind, "series");
	assert.equal(episode.season, 1);
	assert.equal(episode.episode, 3);
	const film = classifyEntry({
		title: "Heat",
		group: "Uncategorized",
		url: "http://cdn.example/heat.mp4",
		attrs: new Map(),
	});
	assert.equal(film.kind, "movie");
});

test("Xtream identity key matches the migration backfill", () => {
	assert.equal(
		xtreamIdentityKey("https://host.example", "alice"),
		"https://host.example\nalice",
	);
});

test("stream userinfo is removed before the request and sent as Basic auth", () => {
	const target = stripUrlUserinfo(
		"https://alice:s3cret@cdn.example/live/a.m3u8",
	);
	assert.equal(target.url.includes("s3cret"), false);
	assert.equal(target.url.includes("alice"), false);
	assert.equal(
		target.headers.authorization,
		`Basic ${Buffer.from("alice:s3cret", "utf8").toString("base64")}`,
	);
	assert.deepEqual(stripUrlUserinfo("https://cdn.example/a").headers, {});
});
