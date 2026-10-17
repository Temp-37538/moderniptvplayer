import { createPageMetadata } from "@/app/metadata";
import { NoPlaylistNotice } from "@/components/no-playlist-notice";
import { resolveActivePlaylistId } from "@/server/active-playlist";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Search Channels",
	description:
		"Search channel categories across your playlists before drilling into individual streams.",
	path: "/dashboard/channels/search",
	noIndex: true,
});

async function Page() {
	const playlistId = await resolveActivePlaylistId();

	if (!playlistId) {
		return <NoPlaylistNotice />;
	}

	redirect(`/dashboard/channels/search/${playlistId}`);
}

export default Page;
