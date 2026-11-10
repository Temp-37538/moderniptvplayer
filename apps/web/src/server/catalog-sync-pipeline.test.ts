import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogRowInput } from "./catalog-index-policy.ts";
import {
	CatalogProviderError,
	CatalogSyncTimeoutError,
	CatalogTooLargeError,
	writeCatalogChunks,
} from "./catalog-sync-pipeline.ts";

function rows(count: number, prefix = "m"): CatalogRowInput[] {
	return Array.from({ length: count }, (_, index) => ({
		kind: "movie",
		itemId: `${prefix}${index}`,
		name: `Movie ${index}`,
		normalizedName: `movie ${index}`,
		categoryIds: ["c1"],
		image: null,
	}));
}

function tracked(chunks: Array<CatalogRowInput[] | Error>) {
	const state = { pulled: 0, returned: false };
	async function* generate() {
		try {
			for (const chunk of chunks) {
				state.pulled += 1;
				if (chunk instanceof Error) {
					throw chunk;
				}
				yield chunk;
			}
		} finally {
			state.returned = true;
		}
	}
	return { state, chunks: generate() };
}

test("chunks are inserted as they arrive, in batches", async () => {
	const { state, chunks } = tracked([rows(5, "a"), rows(3, "b"), []]);
	const inserted: number[] = [];
	const total = await writeCatalogChunks({
		chunks,
		insert: async (batch) => {
			inserted.push(batch.length);
		},
		deadline: Date.now() + 60_000,
		maxRows: 100,
		batchSize: 2,
	});
	assert.equal(total, 8);
	assert.deepEqual(inserted, [2, 2, 1, 2, 1]);
	assert.equal(state.pulled, 3);
	assert.equal(state.returned, true);
});

test("the running total stops the sync as soon as it passes the limit", async () => {
	const { state, chunks } = tracked([rows(4, "a"), rows(4, "b"), rows(4, "c")]);
	const inserted: string[] = [];
	await assert.rejects(
		writeCatalogChunks({
			chunks,
			insert: async (batch) => {
				inserted.push(...batch.map((row) => row.itemId));
			},
			deadline: Date.now() + 60_000,
			maxRows: 6,
			batchSize: 10,
		}),
		CatalogTooLargeError,
	);
	assert.equal(
		inserted.length,
		4,
		"the chunk that crosses the limit is not written",
	);
	assert.equal(state.pulled, 2, "no further provider listing is read");
	assert.equal(state.returned, true);
});

test("exactly the limit is accepted", async () => {
	const { chunks } = tracked([rows(3, "a"), rows(3, "b")]);
	const total = await writeCatalogChunks({
		chunks,
		insert: async () => {},
		deadline: Date.now() + 60_000,
		maxRows: 6,
		batchSize: 10,
	});
	assert.equal(total, 6);
});

test("a slow provider listing hits the deadline of the whole sync", async () => {
	let returned = false;
	const chunks: AsyncIterator<CatalogRowInput[]> = {
		next: () => new Promise(() => {}),
		return: async () => {
			returned = true;
			return { done: true, value: undefined };
		},
	};
	await assert.rejects(
		writeCatalogChunks({
			chunks,
			insert: async () => {},
			deadline: Date.now() + 20,
			maxRows: 100,
			batchSize: 10,
		}),
		CatalogSyncTimeoutError,
	);
	assert.equal(returned, true);
});

test("the deadline is also checked between inserts", async () => {
	const { chunks } = tracked([rows(4)]);
	let inserts = 0;
	await assert.rejects(
		writeCatalogChunks({
			chunks,
			insert: async () => {
				inserts += 1;
				await new Promise((resolve) => setTimeout(resolve, 30));
			},
			deadline: Date.now() + 10,
			maxRows: 100,
			batchSize: 1,
		}),
		CatalogSyncTimeoutError,
	);
	assert.equal(inserts, 1);
});

test("provider failures are told apart from insert failures", async () => {
	const provider = tracked([rows(1), new Error("listing failed")]);
	await assert.rejects(
		writeCatalogChunks({
			chunks: provider.chunks,
			insert: async () => {},
			deadline: Date.now() + 60_000,
			maxRows: 100,
			batchSize: 10,
		}),
		CatalogProviderError,
	);

	const database = tracked([rows(1)]);
	const insertError = new Error("insert failed");
	await assert.rejects(
		writeCatalogChunks({
			chunks: database.chunks,
			insert: async () => {
				throw insertError;
			},
			deadline: Date.now() + 60_000,
			maxRows: 100,
			batchSize: 10,
		}),
		(error) => error === insertError,
	);
	assert.equal(database.state.returned, true);
});
