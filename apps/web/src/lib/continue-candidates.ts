/** How many distinct titles to consider for each shelf slot. */
export const CONTINUE_CANDIDATE_FACTOR = 4;

export type ContinueCandidate = {
	id: string;
	playlistId: string;
	showId: string | null;
	updatedAt: Date | number;
};

function updatedAtMs(value: Date | number): number {
	return value instanceof Date ? value.getTime() : value;
}

function isNewer<T extends ContinueCandidate>(
	candidate: T,
	current: T,
): boolean {
	const candidateMs = updatedAtMs(candidate.updatedAt);
	const currentMs = updatedAtMs(current.updatedAt);
	if (candidateMs !== currentMs) {
		return candidateMs > currentMs;
	}
	return candidate.id > current.id;
}

/**
 * One progress row per series. A season write stores one row per episode with
 * nearly the same time; only the newest (then the greater id) represents the
 * show. Movies have no show id and are left out.
 */
export function latestSeriesRows<T extends ContinueCandidate>(
	rows: readonly T[],
): T[] {
	const newest = new Map<string, T>();
	for (const row of rows) {
		if (!row.showId) {
			continue;
		}
		const key = `${row.playlistId}\u0000${row.showId}`;
		const current = newest.get(key);
		if (!current || isNewer(row, current)) {
			newest.set(key, row);
		}
	}
	return [...newest.values()];
}

/** Newest titles first, capped at `pool`. Series rows must already be distinct. */
export function mergeContinueCandidates<T extends ContinueCandidate>(
	movies: readonly T[],
	series: readonly T[],
	pool: number,
): T[] {
	if (pool <= 0) {
		return [];
	}
	return [...movies, ...series]
		.sort((left, right) => {
			const byTime = updatedAtMs(right.updatedAt) - updatedAtMs(left.updatedAt);
			if (byTime !== 0) {
				return byTime;
			}
			if (left.id === right.id) {
				return 0;
			}
			return left.id < right.id ? 1 : -1;
		})
		.slice(0, pool);
}
