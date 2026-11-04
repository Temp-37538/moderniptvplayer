// The series page has a resume button outside the seasons list: it asks the
// list, which owns the player, to play an episode.
export const PLAY_EPISODE_EVENT = "iptv:play-episode";

export function requestPlayEpisode(episodeId: string) {
	window.dispatchEvent(
		new CustomEvent<string>(PLAY_EPISODE_EVENT, { detail: episodeId }),
	);
}
