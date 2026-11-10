import assert from "node:assert/strict";
import { test } from "node:test";
import { SYNC_TIMEOUT_MS } from "../server/catalog-index-policy.ts";
import {
	formatRetryWait,
	SEARCH_POLL_WINDOW_MS,
} from "./global-search-timing.ts";

test("the search box polls past the sync timeout", () => {
	assert.ok(SEARCH_POLL_WINDOW_MS > SYNC_TIMEOUT_MS);
});

test("the retry wait reads in seconds, then in whole minutes", () => {
	assert.equal(formatRetryWait(1), "1 s");
	assert.equal(formatRetryWait(59), "59 s");
	assert.equal(formatRetryWait(60), "1 min");
	assert.equal(formatRetryWait(61), "2 min");
	assert.equal(formatRetryWait(300), "5 min");
});
