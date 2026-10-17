import { createPageMetadata } from "@/app/metadata";
import { NoPlaylistNotice } from "@/components/no-playlist-notice";
import { resolveActivePlaylistId } from "@/server/active-playlist";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Favorites",
	description: "Browse items saved to your favorites.",
	path: "/dashboard/favorites",
	noIndex: true,
});

async function Page() {
	const playlistId = await resolveActivePlaylistId();

	if (!playlistId) {
		return <NoPlaylistNotice />;
	}

	redirect(`/dashboard/favorites/${playlistId}`);
}

export default Page;
