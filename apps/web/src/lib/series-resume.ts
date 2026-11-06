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
	 * "resume": an episode was left part way. "next": the latest one is
	 * finished and a later episode is not. "start": nothing watched yet.
	 * "rewatch": every later episode is finished too, start over.
	 */
	kind: "resume" | "next" | "start" | "rewatch";
};

export type PlayableEpisodeSource = {
	id?: string | null;
	number?: number | null;
	title?: string | null;
	url?: string | null;
	duration?: number | null;
};

export type PlayableSeasonSource = {
	id?: string | null;
	name?: string | null;
	episodes?: readonly PlayableEpisodeSource[] | null;
};

/** Catalog show fields required to list playable episodes. */
export type PlayableShowSource = {
	seasons?: readonly PlayableSeasonSource[] | null;
};

/** A playable episode in watching order: season after season, stream required. */
export type PlayableEpisodeRef = {
	id: string;
	seasonId: string;
	seasonName: string;
	number: number;
	title: string;
	durationSec: number;
};

/**
 * Watching order shared by the series page and Continue Watching.
 * An episode with no stream is skipped: there is no next episode to invent.
 */
export function listPlayableEpisodes(
	seasons: readonly PlayableSeasonSource[],
): PlayableEpisodeRef[] {
	const episodes: PlayableEpisodeRef[] = [];
	const seen = new Set<string>();
	for (const season of seasons) {
		const seasonName = season.name?.trim() || "Season";
		const seasonId = season.id?.trim() || seasonName;
		for (const episode of season.episodes ?? []) {
			const id = episode.id?.trim() ?? "";
			const url = episode.url?.trim() ?? "";
			if (!id || !url || seen.has(id)) {
				continue;
			}
			seen.add(id);
			const duration = episode.duration ?? 0;
			episodes.push({
				id,
				seasonId,
				seasonName,
				number: episode.number ?? 0,
				title: episode.title?.trim() || `Episode ${episode.number ?? 0}`,
				durationSec:
					Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 0,
			});
		}
	}
	return episodes;
}

/** Watching order for a typed catalog show. Episodes without a stream are skipped. */
export function readPlayableSeasons(
	show: PlayableShowSource,
): PlayableEpisodeRef[] {
	return listPlayableEpisodes(show.seasons ?? []);
}

/** "Season 2 - E04" */
export function formatEpisodeCode(
	seasonName: string,
	episodeNumber: number,
): string {
	const number = String(Math.max(0, Math.floor(episodeNumber))).padStart(
		2,
		"0",
	);
	return `${seasonName} - E${number}`;
}

/** "Show - Season 2 - E04", capped for the progress row. */
export function formatEpisodeProgressName(
	showName: string,
	seasonName: string,
	episodeNumber: number,
): string {
	const show = showName.trim() || "Series";
	return `${show} - ${formatEpisodeCode(seasonName, episodeNumber)}`.slice(
		0,
		300,
	);
}

/**
 * Picks the episode to offer when opening a series.
 *
 * `order` lists the playable episode ids in watching order (season after
 * season). The most recently watched episode decides. Unfinished, it is the
 * one to resume. Finished, the next episode that is not already completed is
 * offered (resumed if it was already started). Episodes that do not exist in
 * `order` are not invented. When nothing remains after the latest one, the
 * series is finished.
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

	for (let index = lastIndex + 1; index < order.length; index++) {
		const nextId = order[index] as string;
		const next = progress[nextId];
		if (next?.completed) {
			continue;
		}
		return {
			episodeId: nextId,
			kind: next && next.positionSec > 0 ? "resume" : "next",
		};
	}

	return { episodeId: first, kind: "rewatch" };
}

/**
 * The episode Continue Watching should surface, or null when the series has
 * not been started or nothing unfinished remains after the latest activity.
 */
export function continueWatchingEpisodeId(
	order: string[],
	progress: Record<string, EpisodeProgressEntry>,
): string | null {
	const target = pickResumeEpisode(order, progress);
	if (!target || target.kind === "start" || target.kind === "rewatch") {
		return null;
	}
	return target.episodeId;
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
