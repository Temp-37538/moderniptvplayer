import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	daysUntilExpiry,
	describeSubscription,
	isExpiringSoon,
} from "./subscription-status.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const at = (ms: number) => ({ status: "Active", expDate: ms / 1000 });

describe("isExpiringSoon", () => {
	it("is false once the date has passed or is now", () => {
		assert.equal(isExpiringSoon(NOW - 1000, NOW), false);
		assert.equal(isExpiringSoon(NOW, NOW), false);
	});

	it("is true from just after now up to exactly 7 days", () => {
		assert.equal(isExpiringSoon(NOW + 1000, NOW), true);
		assert.equal(isExpiringSoon(NOW + 7 * DAY, NOW), true);
	});

	it("is false past 7 days", () => {
		assert.equal(isExpiringSoon(NOW + 7 * DAY + 1000, NOW), false);
		assert.equal(isExpiringSoon(NOW + 30 * DAY, NOW), false);
	});
});

describe("daysUntilExpiry", () => {
	it("counts whole days left and returns null once passed", () => {
		assert.equal(daysUntilExpiry(NOW + 3 * DAY + 5000, NOW), 3);
		assert.equal(daysUntilExpiry(NOW + 5000, NOW), 0);
		assert.equal(daysUntilExpiry(NOW, NOW), null);
	});
});

describe("describeSubscription", () => {
	it("warns within 7 days", () => {
		assert.deepEqual(describeSubscription(at(NOW + 3 * DAY + 60_000), NOW), {
			tone: "warning",
			text: "Expires in 3 days",
		});
		assert.deepEqual(describeSubscription(at(NOW + 7 * DAY), NOW), {
			tone: "warning",
			text: "Expires in 7 days",
		});
	});

	it("says today and tomorrow", () => {
		assert.equal(
			describeSubscription(at(NOW + 2 * 3600_000), NOW).text,
			"Expires today",
		);
		assert.equal(
			describeSubscription(at(NOW + DAY + 60_000), NOW).text,
			"Expires tomorrow",
		);
	});

	it("shows the date when further away", () => {
		assert.deepEqual(describeSubscription(at(NOW + 8 * DAY), NOW), {
			tone: "ok",
			text: "Expires Nov 18, 2026",
		});
	});

	it("flags expired subscriptions as a problem", () => {
		assert.equal(
			describeSubscription(
				{ status: "Expired", expDate: (NOW - DAY) / 1000 },
				NOW,
			).tone,
			"problem",
		);
		assert.deepEqual(describeSubscription(at(NOW - 1000), NOW), {
			tone: "problem",
			text: "Expired Nov 10, 2026",
		});
	});

	it("handles a missing date", () => {
		assert.deepEqual(
			describeSubscription({ status: "Active", expDate: null }, NOW),
			{
				tone: "ok",
				text: "Active",
			},
		);
		assert.deepEqual(describeSubscription({ status: "", expDate: null }, NOW), {
			tone: "ok",
			text: "Unknown",
		});
	});
});
