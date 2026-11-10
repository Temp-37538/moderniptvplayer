import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-container";
import { SavedItemsList } from "@/components/saved-items-list";
import type { PlaylistIdPageProps as PageProps } from "@/components/types";
import { getWatchLaterItems } from "@/server/user-items";
import { getPlaylistById } from "@/server/xtream";
import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
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

export default function WatchLaterPage({ params }: PageProps) {
	return <WatchLaterContent params={params} />;
}

async function WatchLaterContent({ params }: PageProps) {
	const { playlistId } = await params;

	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		notFound();
	}

	const items = await getWatchLaterItems(playlistId);

	return (
		<PageContainer width="narrow">
			<PageHeader
				title="Watch Later"
				description={`${playlist.playlistName} - ${items.length} item${items.length !== 1 ? "s" : ""}`}
			/>
			{items.length === 0 ? (
				<div className="flex min-h-[60vh] items-center justify-center">
					<EmptyState
						icon={<Clock className="size-12 mb-4 opacity-30" />}
						title="No items in Watch Later"
						description="Add items to watch later from channel, movie or series pages"
					/>
				</div>
			) : (
				<div>
					<SavedItemsList
						items={items}
						playlistId={playlistId}
						variant="watchlater"
					/>
				</div>
			)}
		</PageContainer>
	);
}
