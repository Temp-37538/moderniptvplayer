import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SearchMovieCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import type { Metadata } from "next";
import { getCachedMovieCategories } from "@/server/cached-content";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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

export default function MovieSearchCategoriesPage({ params }: PageProps) {
	return <MovieSearchCategoriesContent params={params} />;
}

async function MovieSearchCategoriesContent({ params }: PageProps) {
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
