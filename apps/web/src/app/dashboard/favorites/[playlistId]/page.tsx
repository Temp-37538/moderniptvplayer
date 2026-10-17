import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { EmptyState } from "@/components/empty-state";
import { SavedItemsList } from "@/components/saved-items-list";
import type { PlaylistIdPageProps as PageProps } from "@/components/types";
import { getFavoriteItems } from "@/server/user-items";
import { getPlaylistById } from "@/server/xtream";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
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
		<div className="space-y-6">
			<div className="max-w-2xl space-y-1">
				<h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
				<p className="text-sm text-muted-foreground">
					{playlist.playlistName} - {items.length} item
					{items.length !== 1 ? "s" : ""}
				</p>
			</div>
			{items.length === 0 ? (
				<div className="flex min-h-[60vh] items-center justify-center">
					<EmptyState
						icon={<Heart className="size-12 mb-4 opacity-30" />}
						title="No favorites yet"
						description="Add favorites from channel, movie or series pages"
					/>
				</div>
			) : (
				<div className="max-w-2xl">
					<SavedItemsList
						items={items}
						playlistId={playlistId}
						variant="favorites"
					/>
				</div>
			)}
		</div>
	);
}
