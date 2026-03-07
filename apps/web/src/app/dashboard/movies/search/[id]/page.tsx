import "server-only";
import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SearchMovieCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

async function getCachedMovieCategories(
	playlistId: string,
	playlist: { serverUrl: string; username: string; password: string },
) {
	"use cache";
	cacheLife("hours");
	cacheTag(`playlist-${playlistId}-movie-categories`);
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getMovieCategories();
	return categories as StandardXtreamCategory[];
}

export async function generateMetadata({ params }: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistMetadataContext(id);

	if (!playlist) {
		return createPageMetadata({
			title: "Search Movie Categories",
			description: "Search movie categories from a saved playlist.",
			path: `/dashboard/movies/search/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: "Search Movie Categories",
		description: `Search movie categories available in ${playlist.playlistName}.`,
		path: `/dashboard/movies/search/${id}`,
		noIndex: true,
	});
}

export default async function MovieSearchCategoriesPage({ params }: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedMovieCategories(id, playlist);

	return (
		<SearchMovieCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
