import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBreadcrumbs } from "./breadcrumbs.ts";

const playlists = [{ id: "pl1", playlistName: "My TV" }];

const labelsOf = (pathname: string, labels = {}) =>
	buildBreadcrumbs(pathname, playlists, labels).map(
		(crumb) => `${crumb.label}${crumb.link ? "" : " (text)"}`,
	);

test("the dashboard root is Home", () => {
	assert.deepEqual(labelsOf("/dashboard"), ["Home"]);
});

test("a playlist id reads as its name", () => {
	assert.deepEqual(labelsOf("/dashboard/pl1"), ["Home", "My TV"]);
	assert.deepEqual(labelsOf("/dashboard/movies/pl1"), [
		"Home",
		"Movies",
		"My TV",
	]);
	assert.deepEqual(labelsOf("/dashboard/search/pl1"), [
		"Home",
		"Search",
		"My TV",
	]);
});

test("category and item ids are hidden until the page names them", () => {
	assert.deepEqual(labelsOf("/dashboard/movies/pl1/123/456"), [
		"Home",
		"Movies",
		"My TV",
	]);
	assert.deepEqual(
		labelsOf("/dashboard/movies/pl1/123/456", {
			"/dashboard/movies/pl1/123": "Action",
			"/dashboard/movies/pl1/123/456": "Heat",
		}),
		["Home", "Movies", "My TV", "Action", "Heat"],
	);
});

test("per-category search keeps the playlist and category names", () => {
	assert.deepEqual(
		labelsOf("/dashboard/series/search/pl1/9", {
			"/dashboard/series/search/pl1/9": "Drama",
		}),
		["Home", "Series", "Search", "My TV", "Drama"],
	);
});

test("settings has no index page, so its crumb is plain text", () => {
	assert.deepEqual(labelsOf("/dashboard/settings/account"), [
		"Home",
		"Settings (text)",
		"Account",
	]);
});

test("add playlist steps get readable labels", () => {
	assert.deepEqual(labelsOf("/dashboard/addplaylist/xtream"), [
		"Home",
		"Add playlist",
		"Xtream Codes",
	]);
});

test("unknown ids are never shown", () => {
	assert.deepEqual(labelsOf("/dashboard/unknown"), ["Home"]);
	assert.deepEqual(labelsOf("/dashboard/movies/nope/1"), ["Home", "Movies"]);
});

test("crumbs link to their own path", () => {
	const crumbs = buildBreadcrumbs("/dashboard/channels/pl1", playlists);
	assert.deepEqual(
		crumbs.map((crumb) => crumb.href),
		["/dashboard", "/dashboard/channels", "/dashboard/channels/pl1"],
	);
});
