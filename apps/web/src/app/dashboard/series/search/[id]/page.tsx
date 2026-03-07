import "server-only";
import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SearchSeriesCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

async function getCachedShowCategories(
	playlistId: string,
	playlist: { serverUrl: string; username: string; password: string },
) {
	"use cache";
	cacheLife("hours");
	cacheTag(`playlist-${playlistId}-series-categories`);
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getShowCategories();
	return categories as StandardXtreamCategory[];
}

export async function generateMetadata({ params }: PageProps) {
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

export default async function SeriesSearchCategoriesPage({
	params,
}: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedShowCategories(id, playlist);

	return (
		<SearchSeriesCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
