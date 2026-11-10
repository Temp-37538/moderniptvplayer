import assert from "node:assert/strict";
import { test } from "node:test";
import { pageWindow, splitPage } from "./pagination.ts";

test("a page window starts after the previous pages", () => {
	assert.deepEqual(pageWindow(1, 20), { start: 0, end: 20 });
	assert.deepEqual(pageWindow(3, 20), { start: 40, end: 60 });
});

test("the lookahead reaches past the page", () => {
	assert.deepEqual(pageWindow(2, 20, 1), { start: 20, end: 41 });
});

test("invalid pages and limits fall back to the first page of 20", () => {
	assert.deepEqual(pageWindow(0, 20), { start: 0, end: 20 });
	assert.deepEqual(pageWindow(-2, 20, 1), { start: 0, end: 21 });
	assert.deepEqual(pageWindow(Number.NaN, 0), { start: 0, end: 20 });
	assert.deepEqual(pageWindow(1.7, 20, -1), { start: 0, end: 20 });
});

test("a full page with no extra row has no next page", () => {
	const rows = Array.from({ length: 20 }, (_, index) => index);
	assert.deepEqual(splitPage(rows, 20), { items: rows, hasNextPage: false });
});

test("the extra row means a next page and is not shown", () => {
	const rows = Array.from({ length: 21 }, (_, index) => index);
	const page = splitPage(rows, 20);
	assert.equal(page.hasNextPage, true);
	assert.equal(page.items.length, 20);
	assert.equal(page.items.at(-1), 19);
});

test("a short page has no next page", () => {
	assert.deepEqual(splitPage([1, 2], 20), {
		items: [1, 2],
		hasNextPage: false,
	});
});
