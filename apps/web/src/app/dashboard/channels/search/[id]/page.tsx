import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SearchTvCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import type { Metadata } from "next";
import { getCachedChannelCategories } from "@/server/cached-content";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params;
	const playlist = await getPlaylistMetadataContext(id);

	if (!playlist) {
		return createPageMetadata({
			title: "Search Channel Categories",
			description: "Search TV categories from a saved playlist.",
			path: `/dashboard/channels/search/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: "Search Channel Categories",
		description: `Search the live TV categories available in ${playlist.playlistName}.`,
		path: `/dashboard/channels/search/${id}`,
		noIndex: true,
	});
}

export default function ChannelSearchCategoriesPage({
	params,
}: PageProps) {
	return <ChannelSearchCategoriesContent params={params} />;
}

async function ChannelSearchCategoriesContent({
	params,
}: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedChannelCategories(id, playlist);

	return (
		<SearchTvCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
