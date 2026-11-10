import assert from "node:assert/strict";
import { test } from "node:test";
import { channelNeighbors } from "./channel-neighbors.ts";

const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("previous and next channels of the category", () => {
	assert.deepEqual(channelNeighbors(list, "b"), {
		previous: { id: "a" },
		next: { id: "c" },
	});
});

test("the list wraps around at both ends", () => {
	assert.deepEqual(channelNeighbors(list, "a")?.previous, { id: "c" });
	assert.deepEqual(channelNeighbors(list, "c")?.next, { id: "a" });
});

test("no neighbours for an unknown or lonely channel", () => {
	assert.equal(channelNeighbors(list, "z"), null);
	assert.equal(channelNeighbors([{ id: "a" }], "a"), null);
	assert.equal(channelNeighbors([], "a"), null);
});
