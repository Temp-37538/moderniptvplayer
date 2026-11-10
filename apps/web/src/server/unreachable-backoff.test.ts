import assert from "node:assert/strict";
import { test } from "node:test";
import { createUnreachableBackoff } from "./unreachable-backoff.ts";

test("a timed out provider is blocked only for the window", () => {
	let clock = 1_000;
	const backoff = createUnreachableBackoff(10_000, () => clock);
	assert.equal(backoff.isBlocked("a"), false);
	backoff.markTimedOut("a");
	assert.equal(backoff.isBlocked("a"), true);
	assert.equal(backoff.isBlocked("b"), false);
	clock += 9_999;
	assert.equal(backoff.isBlocked("a"), true);
	clock += 1;
	assert.equal(backoff.isBlocked("a"), false);
});

test("a new timeout restarts the window", () => {
	let clock = 0;
	const backoff = createUnreachableBackoff(5_000, () => clock);
	backoff.markTimedOut("a");
	clock = 4_000;
	backoff.markTimedOut("a");
	clock = 8_000;
	assert.equal(backoff.isBlocked("a"), true);
});
