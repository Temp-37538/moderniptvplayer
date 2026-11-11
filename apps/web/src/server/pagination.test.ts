import assert from "node:assert/strict";
import { test } from "node:test";
import {
	pageCount,
	pageRedirectTarget,
	pageWindow,
	parsePageParam,
	slicePage,
} from "./pagination.ts";

test("a page window starts after the previous pages", () => {
	assert.deepEqual(pageWindow(1, 24), { start: 0, end: 24 });
	assert.deepEqual(pageWindow(3, 24), { start: 48, end: 72 });
});

test("invalid pages and limits fall back to the first page of 20", () => {
	assert.deepEqual(pageWindow(0, 24), { start: 0, end: 24 });
	assert.deepEqual(pageWindow(-2, 24), { start: 0, end: 24 });
	assert.deepEqual(pageWindow(Number.NaN, 0), { start: 0, end: 20 });
	assert.deepEqual(pageWindow(1.7, 24), { start: 0, end: 24 });
});

test("a page keeps the size of the whole category", () => {
	const rows = Array.from({ length: 50 }, (_, index) => index);
	const page = slicePage(rows, 3, 24);
	assert.deepEqual(page.items, [48, 49]);
	assert.equal(page.total, 50);
	assert.deepEqual(slicePage(rows, 4, 24), { items: [], total: 50 });
});

test("an exact multiple of the page size has no extra empty page", () => {
	assert.equal(pageCount(48, 24), 2);
	assert.equal(pageCount(49, 24), 3);
	assert.equal(pageCount(24, 24), 1);
});

test("an empty category still reads as one page", () => {
	assert.equal(pageCount(0, 24), 1);
	assert.equal(pageCount(Number.NaN, 24), 1);
});

test("a page param reads plain whole numbers and defaults to 1", () => {
	assert.equal(parsePageParam(undefined), 1);
	assert.equal(parsePageParam("1"), 1);
	assert.equal(parsePageParam("12"), 12);
	assert.equal(parsePageParam(["3", "4"]), 3);
});

test("a page param rejects anything else", () => {
	for (const raw of ["", " ", "0", "-1", "1.5", "abc", "2abc", "1e3", []]) {
		assert.equal(parsePageParam(raw), null, JSON.stringify(raw));
	}
});

test("valid pages in range need no redirect", () => {
	assert.equal(pageRedirectTarget(undefined, 1), null);
	assert.equal(pageRedirectTarget("2", 2), null);
});

test("malformed pages go to page 1 and late pages to the last one", () => {
	assert.equal(pageRedirectTarget("abc", 5), 1);
	assert.equal(pageRedirectTarget("0", 5), 1);
	assert.equal(pageRedirectTarget("999", 5), 5);
	assert.equal(pageRedirectTarget("2", 1), 1);
});

test("a repeated page param collapses to its first value", () => {
	assert.equal(pageRedirectTarget(["2", "3"], 5), 2);
});
