import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SearchSeriesCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import type { Metadata } from "next";
import { getCachedSeriesCategories } from "@/server/cached-content";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params;
	const playlist = await getPlaylistMetadataContext(id);

	if (!playlist) {
		return createPageMetadata({
			title: "Search Series Categories",
			description: "Search series categories from a saved playlist.",
			path: `/dashboard/series/search/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: "Search Series Categories",
		description: `Search series categories available in ${playlist.playlistName}.`,
		path: `/dashboard/series/search/${id}`,
		noIndex: true,
	});
}

export default function SeriesSearchCategoriesPage({
	params,
}: PageProps) {
	return <SearchSeriesCategoriesContent params={params} />;
}

async function SearchSeriesCategoriesContent({
	params,
}: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedSeriesCategories(id, playlist);

	return (
		<SearchSeriesCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
