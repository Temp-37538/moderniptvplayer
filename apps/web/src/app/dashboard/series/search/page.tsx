import { createPageMetadata } from "@/app/metadata";
import { NoPlaylistNotice } from "@/components/no-playlist-notice";
import { resolveActivePlaylistId } from "@/server/active-playlist";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Search Series",
	description:
		"Search series categories across your playlists before opening shows and seasons.",
	path: "/dashboard/series/search",
	noIndex: true,
});

async function Page() {
	const playlistId = await resolveActivePlaylistId();

	if (!playlistId) {
		return <NoPlaylistNotice />;
	}

	redirect(`/dashboard/series/search/${playlistId}`);
}

export default Page;
