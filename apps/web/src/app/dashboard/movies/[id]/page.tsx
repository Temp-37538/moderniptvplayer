import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import type { IdPageProps as PageProps } from "@/components/types";
import { getCachedMovieCategories } from "@/server/cached-content";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";
import { MovieCategorySearch } from "@/components/series-category-search";

export async function generateMetadata({ params }: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistMetadataContext(id);

	if (!playlist) {
		return createPageMetadata({
			title: "Movie Categories",
			description: "Browse movie categories from a saved playlist.",
			path: `/dashboard/movies/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: "Movie Categories",
		description: `Browse movie categories available in ${playlist.playlistName}.`,
		path: `/dashboard/movies/${id}`,
		noIndex: true,
	});
}

export default async function MovieCategoriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedMovieCategories(id, playlist);

	return (
		<MovieCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
