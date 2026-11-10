import type { CatalogRowInput } from "./catalog-index-policy.ts";

export class CatalogTooLargeError extends Error {}
export class CatalogSyncTimeoutError extends Error {}

/** Thrown by the provider side (fetching or mapping a listing). */
export class CatalogProviderError extends Error {
	constructor(cause: unknown) {
		super("Catalogue provider failed", { cause });
	}
}

function withDeadline<T>(work: Promise<T>, deadline: number): Promise<T> {
	const remainingMs = deadline - Date.now();
	if (remainingMs <= 0) {
		return Promise.reject(new CatalogSyncTimeoutError());
	}
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new CatalogSyncTimeoutError()),
			remainingMs,
		);
		work.then(
			(value) => {
				clearTimeout(timeout);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timeout);
				reject(error);
			},
		);
	});
}

/**
 * Drain catalogue row chunks into the database as they arrive, so only one
 * chunk of rows (and the provider listing it came from) is in memory at a
 * time. Stops with `CatalogTooLargeError` as soon as the running total passes
 * `maxRows`, and with `CatalogSyncTimeoutError` once `deadline` passes, both
 * while waiting on the provider and between inserts. Returns the row count.
 */
export async function writeCatalogChunks(input: {
	chunks: AsyncIterator<CatalogRowInput[]>;
	insert: (rows: readonly CatalogRowInput[]) => Promise<void>;
	deadline: number;
	maxRows: number;
	batchSize: number;
}): Promise<number> {
	let total = 0;
	let finished = false;
	try {
		while (true) {
			let step: IteratorResult<CatalogRowInput[]>;
			try {
				step = await withDeadline(input.chunks.next(), input.deadline);
			} catch (error) {
				if (error instanceof CatalogSyncTimeoutError) {
					throw error;
				}
				throw new CatalogProviderError(error);
			}
			if (step.done) {
				finished = true;
				return total;
			}
			const rows = step.value;
			total += rows.length;
			if (total > input.maxRows) {
				throw new CatalogTooLargeError();
			}
			for (let offset = 0; offset < rows.length; offset += input.batchSize) {
				if (Date.now() >= input.deadline) {
					throw new CatalogSyncTimeoutError();
				}
				await input.insert(rows.slice(offset, offset + input.batchSize));
			}
		}
	} finally {
		if (!finished) {
			// Do not wait: a provider request may still be pending.
			input.chunks.return?.().catch(() => {});
		}
	}
}
