import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export async function generateMetadata({
		params,
	}: {
		params: Promise<{ playlistId: string }>;
	}): Promise<Metadata> {
		const { playlistId } = await params;
		const playlist = await getPlaylistMetadataContext(playlistId);

		if (!playlist) {
			return createPageMetadata({
				title: "Playlist",
				description: "Browse a saved IPTV playlist from your dashboard.",
				path: `/dashboard/${playlistId}`,
				noIndex: true,
			});
		}

		return createPageMetadata({
			title: playlist.playlistName,
			description: `Browse channels, movies, and series from the ${playlist.playlistName} playlist.`,
			path: `/dashboard/${playlistId}`,
			noIndex: true,
		});
	}

export default function PlaylistHomePage({
	params,
}: {
	params: Promise<{ playlistId: string }>;
}) {
	return <PlaylistHomeContent params={params} />;
}

async function PlaylistHomeContent({
	params,
}: {
	params: Promise<{ playlistId: string }>;
}) {
	const { playlistId } = await params;

	return <div>Home - Playlist: {playlistId}</div>;
}
