import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import type { PlaylistIdPageProps as PageProps } from "@/components/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaylistById } from "@/server/xtream";
import { getFavoriteItems } from "@/server/user-items";
import { SavedItemsList } from "@/components/saved-items-list";
import { Heart } from "lucide-react";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { playlistId } = await params;
	const playlist = await getPlaylistMetadataContext(playlistId);

	return createPageMetadata({
		title: "Favorites",
		description: playlist
			? `Browse favorite items saved from ${playlist.playlistName}.`
			: "Browse items saved to your favorites.",
		path: `/dashboard/favorites/${playlistId}`,
		noIndex: true,
	});
}

export default function FavoritesPage({ params }: PageProps) {
	return <FavoritesContent params={params} />;
}

async function FavoritesContent({ params }: PageProps) {
	const { playlistId } = await params;

	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		notFound();
	}

	const items = await getFavoriteItems(playlistId);

	return (
		<div className="max-w-2xl space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
					<Heart className="size-6 text-red-500" />
					Favorites
				</h1>
				<p className="text-sm text-muted-foreground">
					{playlist.playlistName} &middot; {items.length} item
					{items.length !== 1 ? "s" : ""}
				</p>
			</div>
			<SavedItemsList
				items={items}
				playlistId={playlistId}
				variant="favorites"
			/>
		</div>
	);
}
