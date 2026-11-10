import assert from "node:assert/strict";
import { test } from "node:test";
import { processMap } from "./process-map.ts";

test("every module copy gets the same map for one name", async () => {
	const first = processMap<string, number>("test-shared");
	first.set("a", 1);

	// A second, separately evaluated copy of the module stands in for another
	// Next route bundle.
	const copy = (await import(
		`./process-map.ts?copy=${Date.now()}`
	)) as typeof import("./process-map.ts");
	assert.notEqual(copy.processMap, processMap);
	const second = copy.processMap<string, number>("test-shared");
	assert.equal(second, first);

	second.delete("a");
	assert.equal(first.has("a"), false);
	assert.notEqual(processMap("test-other"), first);
});
