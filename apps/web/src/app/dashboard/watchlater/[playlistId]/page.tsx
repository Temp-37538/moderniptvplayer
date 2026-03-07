import "server-only";
import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import type { PlaylistIdPageProps as PageProps } from "@/components/types";
import { notFound } from "next/navigation";
import { getPlaylistById } from "@/server/xtream";
import { getWatchLaterItems } from "@/server/user-items";
import { SavedItemsList } from "@/components/saved-items-list";
import { Clock } from "lucide-react";

export async function generateMetadata({ params }: PageProps) {
	const { playlistId } = await params;
	const playlist = await getPlaylistMetadataContext(playlistId);

	return createPageMetadata({
		title: "Watch Later",
		description: playlist
			? `Browse items saved to watch later from ${playlist.playlistName}.`
			: "Browse items saved to your watch later queue.",
		path: `/dashboard/watchlater/${playlistId}`,
		noIndex: true,
	});
}

export default async function WatchLaterPage({ params }: PageProps) {
	const { playlistId } = await params;

	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		notFound();
	}

	const items = await getWatchLaterItems(playlistId);

	return (
		<div className="max-w-2xl space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
					<Clock className="size-6 text-blue-500" />
					Watch Later
				</h1>
				<p className="text-sm text-muted-foreground">
					{playlist.playlistName} &middot; {items.length} item
					{items.length !== 1 ? "s" : ""}
				</p>
			</div>
			<SavedItemsList
				items={items}
				playlistId={playlistId}
				variant="watchlater"
			/>
		</div>
	);
}
