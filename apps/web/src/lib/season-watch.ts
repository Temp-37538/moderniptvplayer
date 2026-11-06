export type SeasonWatchChoice = {
	watched: boolean;
	label: string;
};

/**
 * Actions for a season. An empty episode list is not "all watched": offering
 * mark-unwatched would ask the server for a season it cannot find.
 */
export function seasonWatchActions(
	episodes: readonly { id: string }[],
	progress: Readonly<Record<string, { completed?: boolean } | undefined>>,
): SeasonWatchChoice[] {
	if (episodes.length === 0) {
		return [];
	}
	const completed = episodes.filter(
		(episode) => progress[episode.id]?.completed,
	).length;
	if (completed === episodes.length) {
		return [{ watched: false, label: "Mark unwatched" }];
	}
	if (completed === 0) {
		return [{ watched: true, label: "Mark watched" }];
	}
	return [
		{ watched: true, label: "Mark watched" },
		{ watched: false, label: "Mark unwatched" },
	];
}
