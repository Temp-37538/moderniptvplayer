import "server-only";
import { cookies } from "next/headers";
import { fetchPlaylists } from "./queries";

export const ACTIVE_PLAYLIST_COOKIE = "active_playlist_id";

export async function resolveActivePlaylistId(): Promise<string | null> {
	const playlists = await fetchPlaylists();

	if (playlists.length === 0) {
		return null;
	}

	const cookieStore = await cookies();
	const activePlaylistId = cookieStore.get(ACTIVE_PLAYLIST_COOKIE)?.value;
	const selectedPlaylist =
		playlists.find((playlist) => playlist.id === activePlaylistId) ??
		playlists[0];

	return selectedPlaylist.id;
}
