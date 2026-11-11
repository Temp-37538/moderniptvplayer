// The series page has a resume button outside the seasons list: it asks the
// list, which owns the player, to play an episode.
export const PLAY_EPISODE_EVENT = "iptv:play-episode";

export type PlayEpisodeRequest = {
	episodeId: string;
	/** Ignore the saved position and play from the beginning. */
	fromStart: boolean;
};

export function requestPlayEpisode(
	episodeId: string,
	{ fromStart = false }: { fromStart?: boolean } = {},
) {
	window.dispatchEvent(
		new CustomEvent<PlayEpisodeRequest>(PLAY_EPISODE_EVENT, {
			detail: { episodeId, fromStart },
		}),
	);
}
