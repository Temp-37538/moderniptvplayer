import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTimeLeft, progressPercent } from "./watch-progress-format.ts";

describe("progressPercent", () => {
	it("returns 0 without a usable duration or position", () => {
		assert.equal(progressPercent(120, 0), 0);
		assert.equal(progressPercent(0, 600), 0);
		assert.equal(progressPercent(Number.NaN, 600), 0);
	});

	it("rounds and caps at 100", () => {
		assert.equal(progressPercent(200, 600), 33);
		assert.equal(progressPercent(900, 600), 100);
	});
});

describe("formatTimeLeft", () => {
	it("returns null when the duration is unknown", () => {
		assert.equal(formatTimeLeft(30, 0), null);
	});

	it("formats minutes and hours", () => {
		assert.equal(formatTimeLeft(0, 42 * 60), "42 min left");
		assert.equal(formatTimeLeft(60, 2 * 3600 + 60), "2 h left");
		assert.equal(formatTimeLeft(0, 3900), "1 h 5 min left");
	});

	it("says almost done in the last minute", () => {
		assert.equal(formatTimeLeft(590, 600), "Almost done");
		assert.equal(formatTimeLeft(700, 600), "Almost done");
	});
});
