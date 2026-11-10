import assert from "node:assert/strict";
import { test } from "node:test";
import {
	clearedItemsTotal,
	convertM3uRows,
	conversionSuccessMessage,
	M3uConversionTargetMissingError,
	type SavedItemCounts,
} from "./m3u-conversion.ts";

function recorder(options: {
	converted?: number;
	failConvert?: Error;
	failClear?: "favorites" | "watchLater" | "progress" | "categoryPreferences";
}) {
	const calls: string[] = [];
	const step = (name: string, count: number) => () => {
		calls.push(name);
		if (name === "convert" && options.failConvert) {
			return Promise.reject(options.failConvert);
		}
		if (name === options.failClear) {
			return Promise.reject(new Error(`${name} failed`));
		}
		return Promise.resolve({ count });
	};
	return {
		calls,
		steps: {
			convert: step("convert", options.converted ?? 1),
			clear: {
				favorites: step("favorites", 3),
				watchLater: step("watchLater", 2),
				progress: step("progress", 5),
				categoryPreferences: step("categoryPreferences", 1),
			},
		},
	};
}

test("a converted playlist loses the rows saved against M3U ids", async () => {
	const { calls, steps } = recorder({});

	const counts = await convertM3uRows(steps);

	assert.deepEqual(counts, {
		favorites: 3,
		watchLater: 2,
		progress: 5,
		categoryPreferences: 1,
	});
	assert.deepEqual(calls, [
		"convert",
		"favorites",
		"watchLater",
		"progress",
		"categoryPreferences",
	]);
	assert.equal(clearedItemsTotal(counts), 11);
});

test("nothing is removed when the update matched no M3U playlist", async () => {
	const { calls, steps } = recorder({ converted: 0 });

	await assert.rejects(
		() => convertM3uRows(steps),
		(error) => error instanceof M3uConversionTargetMissingError,
	);

	assert.deepEqual(calls, ["convert"]);
});

test("a failed update removes nothing and keeps its error", async () => {
	const unique = new Error("unique violation");
	const { calls, steps } = recorder({ failConvert: unique });

	await assert.rejects(
		() => convertM3uRows(steps),
		(error) => error === unique,
	);

	assert.deepEqual(calls, ["convert"]);
});

test("a failed removal surfaces so the transaction rolls back", async () => {
	const { calls, steps } = recorder({ failClear: "progress" });

	await assert.rejects(() => convertM3uRows(steps), /progress failed/);

	assert.deepEqual(calls, ["convert", "favorites", "watchLater", "progress"]);
});

test("the message tells the user what was cleared", () => {
	const none: SavedItemCounts = {
		favorites: 0,
		watchLater: 0,
		progress: 0,
		categoryPreferences: 0,
	};

	assert.equal(
		conversionSuccessMessage(none),
		"Playlist updated. Your M3U link was refused by the server (HTTP 884), so the playlist now signs in with Xtream using the username and password from the link.",
	);
	const message = conversionSuccessMessage({ ...none, progress: 1 });
	assert.match(message, /cleared/);
	assert.match(message, /favorites/);
	assert.match(message, /Xtream catalog/);
});
