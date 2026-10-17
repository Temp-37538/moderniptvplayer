export type EpisodeProgressEntry = {
	positionSec: number;
	durationSec: number;
	completed: boolean;
	/** Epoch milliseconds of the last save. */
	updatedAt: number;
};

export type ResumeTarget = {
	episodeId: string;
	/**
	 * "resume": an episode was left half way. "next": the last one is finished,
	 * this is the following one. "start": nothing watched yet. "rewatch": the
	 * whole series is finished, start over.
	 */
	kind: "resume" | "next" | "start" | "rewatch";
};

/**
 * Picks the episode to offer when opening a series.
 *
 * `order` lists the playable episode ids in watching order (season after
 * season). The most recently watched episode decides: unfinished, it is the
 * one to resume; finished, the next one is offered (resumed if it was already
 * started).
 */
export function pickResumeEpisode(
	order: string[],
	progress: Record<string, EpisodeProgressEntry>,
): ResumeTarget | null {
	const first = order[0];
	if (first === undefined) {
		return null;
	}

	let lastIndex = -1;
	let lastAt = -1;
	order.forEach((id, index) => {
		const entry = progress[id];
		if (entry && entry.updatedAt > lastAt) {
			lastAt = entry.updatedAt;
			lastIndex = index;
		}
	});
	if (lastIndex === -1) {
		return { episodeId: first, kind: "start" };
	}

	const lastId = order[lastIndex] as string;
	if (!progress[lastId]?.completed) {
		return { episodeId: lastId, kind: "resume" };
	}

	const nextId = order[lastIndex + 1];
	if (nextId === undefined) {
		return { episodeId: first, kind: "rewatch" };
	}
	const next = progress[nextId];
	return {
		episodeId: nextId,
		kind: next && !next.completed && next.positionSec > 0 ? "resume" : "next",
	};
}

/** 3725 -> "1:02:05", 754 -> "12:34". */
export function formatTimestamp(totalSeconds: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (value: number) => String(value).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
