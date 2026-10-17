import { createPageMetadata } from "@/app/metadata";
import { NoPlaylistNotice } from "@/components/no-playlist-notice";
import { resolveActivePlaylistId } from "@/server/active-playlist";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Movie Categories",
	description: "Browse movie categories from a saved playlist.",
	path: "/dashboard/movies",
	noIndex: true,
});

async function Page() {
	const playlistId = await resolveActivePlaylistId();

	if (!playlistId) {
		return <NoPlaylistNotice />;
	}

	redirect(`/dashboard/movies/${playlistId}`);
}

export default Page;
