import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSearchKind, searchQueryString } from "./global-search-url.ts";

test("only known filters are read from the address", () => {
	assert.equal(parseSearchKind("movie"), "movie");
	assert.equal(parseSearchKind("series"), "series");
	assert.equal(parseSearchKind("channel"), "channel");
	assert.equal(parseSearchKind("all"), "all");
	assert.equal(parseSearchKind("bogus"), "all");
	assert.equal(parseSearchKind(null), "all");
});

test("the text and the filter go into the address", () => {
	assert.equal(
		searchQueryString("", { q: "star wars", kind: "movie" }),
		"?q=star+wars&kind=movie",
	);
});

test("defaults are left out of the address", () => {
	assert.equal(
		searchQueryString("?q=old&kind=movie", { q: "  ", kind: "all" }),
		"",
	);
	assert.equal(searchQueryString("", { q: "news", kind: "all" }), "?q=news");
});

test("other parameters are kept", () => {
	assert.equal(
		searchQueryString("?from=sidebar&q=a", { q: "ab", kind: "series" }),
		"?from=sidebar&q=ab&kind=series",
	);
});
