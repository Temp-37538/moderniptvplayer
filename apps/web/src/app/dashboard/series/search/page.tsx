import { createPageMetadata } from "@/app/metadata";
import { fetchPlaylists } from "@/server/queries";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACTIVE_PLAYLIST_COOKIE = "active_playlist_id";

export const metadata: Metadata = createPageMetadata({
	title: "Search Series",
	description:
		"Search series categories across your playlists before opening shows and seasons.",
	path: "/dashboard/series/search",
	noIndex: true,
});

async function Page() {
	const playlists = await fetchPlaylists();
	if (playlists.length === 0) {
		return <div>No playlists available</div>;
	}

	const cookieStore = await cookies();
	const activePlaylistId = cookieStore.get(ACTIVE_PLAYLIST_COOKIE)?.value;
	const selectedPlaylist =
		playlists.find((playlist) => playlist.id === activePlaylistId) ??
		playlists[0];

	redirect(`/dashboard/series/search/${selectedPlaylist.id}`);
}

export default Page;
