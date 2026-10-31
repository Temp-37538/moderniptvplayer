export type PlayerSource = {
	/**
	 * "native": mp4 and friends. "hls": .m3u8. "mpegts": raw live MPEG-TS.
	 * "direct": the provider's own URL, played from the user's connection (for
	 * providers that refuse the server's IP). Browsers only allow it on a secure
	 * page when "Insecure content" is allowed for the site; the desktop app plays
	 * it with mpv instead, where that setting does not exist.
	 */
	kind: "native" | "hls" | "mpegts" | "direct";
	src: string;
};

/** What is stored to resume a film or an episode later. */
export type ProgressDetails = {
	playlistId: string;
	itemId: string;
	itemType: "movie" | "episode";
	itemName: string;
	/** In-app page to come back to. */
	itemUrl: string;
	/** The provider's poster URL (it is proxied when displayed). */
	itemImage?: string | null;
	showId?: string | null;
};
