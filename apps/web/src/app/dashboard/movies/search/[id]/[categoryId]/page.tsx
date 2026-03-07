import "server-only";
import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import { CategoryItemSearch } from "@/components/category-item-search";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
	const { id, categoryId } = await params;
	const context = await getCategoryMetadataContext("movies", id, categoryId);
	const categoryTitle = context?.categoryName ?? "Movie Search";

	return createPageMetadata({
		title: `Search ${categoryTitle}`,
		description: context?.playlist
			? `Search movies in ${categoryTitle.toLowerCase()} from ${context.playlist.playlistName}.`
			: "Search movies within a playlist category.",
		path: `/dashboard/movies/search/${id}/${categoryId}`,
		noIndex: true,
	});
}

export default async function MovieCategorySearchPage({ params }: PageProps) {
	const { id, categoryId } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	return (
		<CategoryItemSearch
			section="movies"
			playlistId={id}
			categoryId={categoryId}
		/>
	);
}
