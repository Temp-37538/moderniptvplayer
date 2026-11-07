export type PlaylistSourceKind = "XTREAM" | "M3U";

export function isM3uSource(source: string | null | undefined): boolean {
	return source === "M3U";
}

/** Account line that is safe to render. M3U credentials stay off this string. */
export function playlistAccountLine(playlist: {
	source?: string | null;
	username: string;
	serverUrl: string;
}): string {
	if (isM3uSource(playlist.source)) {
		return `M3U - ${playlist.serverUrl}`;
	}
	return `${playlist.username} - ${playlist.serverUrl}`;
}
