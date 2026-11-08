import assert from "node:assert/strict";
import { test } from "node:test";
import {
	CATALOG_IMAGE_MAX,
	CATALOG_MAX_ROWS,
	CATALOG_NAME_MAX,
	CATALOG_TTL_MS,
	SEARCH_MAX_TOKENS,
	SEARCH_QUERY_MAX,
	SYNC_LOCK_MS,
	SYNC_RETRY_COOLDOWN_MS,
	decideSync,
	normalizeSearchText,
	parseSearchTokens,
	pickOpenCategory,
	rankMatch,
	searchHref,
	toCatalogRows,
} from "./catalog-index-policy.ts";

test("normalizes Latin text without dropping native scripts", () => {
	assert.equal(normalizeSearchText("Amélie"), "amelie");
	assert.equal(
		normalizeSearchText("Spider-Man: No Way Home"),
		"spider man no way home",
	);
	assert.equal(normalizeSearchText("Ø Œuvre"), "o oeuvre");
	assert.equal(normalizeSearchText("Straße"), "strasse");
	assert.equal(normalizeSearchText("فيلم عربي"), "فيلم عربي");
	assert.equal(normalizeSearchText("Матрица"), "матрица");
	assert.equal(normalizeSearchText("蜘蛛侠"), "蜘蛛侠");
	assert.equal(normalizeSearchText(""), "");
	assert.equal(normalizeSearchText("!? - _"), "");
});

test("parses bounded, unique search tokens", () => {
	assert.equal(parseSearchTokens("a"), null);
	assert.equal(parseSearchTokens("!?"), null);
	assert.equal(parseSearchTokens("x".repeat(SEARCH_QUERY_MAX + 1)), null);
	assert.deepEqual(parseSearchTokens("  Spider   Man spider  "), [
		"spider",
		"man",
	]);
	const many = parseSearchTokens("one two three four five six seven");
	assert.deepEqual(many, ["one", "two", "three", "four", "five", "six"]);
	assert.equal(many?.length, SEARCH_MAX_TOKENS);
	assert.deepEqual(parseSearchTokens("  matrix   reloaded  "), [
		"matrix",
		"reloaded",
	]);
});

test("catalog row mapping never copies provider stream credentials", () => {
	const source = {
		id: "movie-1",
		name: "A movie",
		categoryIds: ["movies"],
		url: "https://provider.example/movie/username/password/123.mp4",
		stream_url: "https://provider.example/username/password",
	};
	const rows = toCatalogRows("movie", [source]);
	assert.equal(rows.length, 1);
	const serialized = JSON.stringify(rows);
	assert.equal(serialized.includes("username"), false);
	assert.equal(serialized.includes("password"), false);
	assert.equal("url" in (rows[0] ?? {}), false);
	assert.deepEqual(Object.keys(rows[0] ?? {}).sort(), [
		"categoryIds",
		"image",
		"itemId",
		"kind",
		"name",
		"normalizedName",
	]);
});

test("catalog row mapping validates ids, names, categories, images and duplicates", () => {
	const rows = toCatalogRows("movie", [
		{ id: "../x", name: "Invalid id", categoryIds: ["1"] },
		{ id: "has space", name: "Invalid id", categoryIds: ["1"] },
		{ id: "x".repeat(65), name: "Invalid id", categoryIds: ["1"] },
		{ id: "empty-name", name: "  ", categoryIds: ["1"] },
		{
			id: "long-name",
			name: "n".repeat(400),
			categoryIds: ["1"],
			poster: "javascript:alert(1)",
		},
		{
			id: "invalid-category",
			name: "No category",
			categoryIds: ["bad/id", " "],
		},
		{
			id: "safe-image",
			name: "Safe image",
			categoryIds: ["2"],
			poster: "https://images.example/poster.jpg",
		},
		{
			id: "unsafe-data",
			name: "Unsafe data",
			categoryIds: ["3"],
			poster: "data:image/png;base64,abc",
		},
		{
			id: "duplicate",
			name: "First duplicate",
			categoryIds: ["4"],
		},
		{
			id: "duplicate",
			name: "Second duplicate",
			categoryIds: ["5"],
		},
		null,
		"not an object",
	]);

	assert.equal(rows.length, 4);
	assert.equal(rows.find((row) => row.itemId === "long-name")?.name.length, CATALOG_NAME_MAX);
	assert.equal(rows.find((row) => row.itemId === "long-name")?.image, null);
	assert.equal(rows.find((row) => row.itemId === "safe-image")?.image, "https://images.example/poster.jpg");
	assert.equal(rows.find((row) => row.itemId === "unsafe-data")?.image, null);
	assert.equal(rows.find((row) => row.itemId === "duplicate")?.name, "First duplicate");
	assert.equal(rows.some((row) => row.itemId === "invalid-category"), false);
	assert.ok(CATALOG_MAX_ROWS > 0);
	assert.ok(CATALOG_IMAGE_MAX > 0);
});

test("prefers the first non-empty image field and validates it", () => {
	const rows = toCatalogRows("channel", [
		{
			id: "1",
			name: "Channel",
			categoryId: "live",
			poster: "javascript:bad",
			logo: "https://images.example/logo.png",
		},
	]);
	assert.equal(rows[0]?.image, null);
});

test("picks a visible category unless any membership is adult", () => {
	assert.equal(
		pickOpenCategory({
			categoryIds: ["hidden", "visible"],
			hiddenIds: new Set(["hidden"]),
			adultIds: new Set(),
		}),
		"visible",
	);
	assert.equal(
		pickOpenCategory({
			categoryIds: ["hidden"],
			hiddenIds: new Set(["hidden"]),
			adultIds: new Set(),
		}),
		null,
	);
	assert.equal(
		pickOpenCategory({
			categoryIds: ["visible", "adult"],
			hiddenIds: new Set(),
			adultIds: new Set(["adult"]),
		}),
		null,
	);
	assert.equal(
		pickOpenCategory({
			categoryIds: ["adult"],
			hiddenIds: new Set(),
			adultIds: new Set(),
		}),
		"adult",
	);
});

test("ranks exact, prefix, word-prefix, and partial matches", () => {
	assert.equal(rankMatch("spider man", ["spider", "man"]), 0);
	assert.equal(rankMatch("spider man no way home", ["spider", "man"]), 1);
	assert.equal(rankMatch("the spider-man returns", ["spid", "returns"]), 2);
	assert.equal(rankMatch("the amazing spider returns", ["maz", "turn"]), 3);
	assert.equal(rankMatch("the amazing spider", ["missing"]), null);
});

test("builds encoded routes for each catalog kind", () => {
	assert.equal(
		searchHref("channel", "p / 1", "c?1", "item#1"),
		"/dashboard/channels/p%20%2F%201/c%3F1/item%231",
	);
	assert.equal(
		searchHref("movie", "playlist", "movies", "42"),
		"/dashboard/movies/playlist/movies/42",
	);
	assert.equal(
		searchHref("series", "playlist", "series", "show"),
		"/dashboard/series/playlist/series/show",
	);
});

test("decides when to build, serve, refresh, or report unavailable", () => {
	const now = new Date("2026-11-08T12:00:00.000Z");
	const fresh = new Date(now.getTime() - CATALOG_TTL_MS + 1);
	const stale = new Date(now.getTime() - CATALOG_TTL_MS - 1);
	const recentAttempt = new Date(now.getTime() - SYNC_RETRY_COOLDOWN_MS + 1);
	const oldAttempt = new Date(now.getTime() - SYNC_RETRY_COOLDOWN_MS - 1);
	const lockedUntil = new Date(now.getTime() + SYNC_LOCK_MS);

	assert.equal(decideSync(null, now), "build");
	assert.equal(
		decideSync(
			{
				status: "idle",
				activeSyncId: null,
				syncedAt: null,
				lockedUntil: null,
				lastAttemptAt: null,
			},
			now,
		),
		"build",
	);
	assert.equal(
		decideSync(
			{
				status: "syncing",
				activeSyncId: null,
				syncedAt: null,
				lockedUntil,
				lastAttemptAt: now,
			},
			now,
		),
		"build",
	);
	assert.equal(
		decideSync(
			{
				status: "failed",
				activeSyncId: null,
				syncedAt: null,
				lockedUntil: null,
				lastAttemptAt: recentAttempt,
			},
			now,
		),
		"unavailable",
	);
	assert.equal(
		decideSync(
			{
				status: "failed",
				activeSyncId: null,
				syncedAt: null,
				lockedUntil: new Date(now.getTime() - 1),
				lastAttemptAt: oldAttempt,
			},
			now,
		),
		"build",
	);
	assert.equal(
		decideSync(
			{
				status: "ready",
				activeSyncId: "active",
				syncedAt: fresh,
				lockedUntil: null,
				lastAttemptAt: null,
			},
			now,
		),
		"serve",
	);
	assert.equal(
		decideSync(
			{
				status: "ready",
				activeSyncId: "active",
				syncedAt: stale,
				lockedUntil: null,
				lastAttemptAt: oldAttempt,
			},
			now,
		),
		"serve-and-refresh",
	);
	assert.equal(
		decideSync(
			{
				status: "syncing",
				activeSyncId: "active",
				syncedAt: stale,
				lockedUntil,
				lastAttemptAt: now,
			},
			now,
		),
		"serve",
	);
	assert.equal(
		decideSync(
			{
				status: "failed",
				activeSyncId: "active",
				syncedAt: stale,
				lockedUntil: null,
				lastAttemptAt: recentAttempt,
			},
			now,
		),
		"serve",
	);
	assert.equal(
		decideSync(
			{
				status: "failed",
				activeSyncId: "active",
				syncedAt: stale,
				lockedUntil: null,
				lastAttemptAt: oldAttempt,
			},
			now,
		),
		"serve-and-refresh",
	);
	assert.equal(
		decideSync(
			{
				status: "syncing",
				activeSyncId: "active",
				syncedAt: stale,
				lockedUntil: new Date(now.getTime() - 1),
				lastAttemptAt: now,
			},
			now,
		),
		"serve-and-refresh",
	);
});
