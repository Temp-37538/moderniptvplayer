import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import { CategoryItemSearch } from "@/components/category-item-search";
import type { Metadata } from "next";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
};

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
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

export default function MovieCategorySearchPage({ params }: PageProps) {
	return <MovieCategorySearchContent params={params} />;
}

async function MovieCategorySearchContent({ params }: PageProps) {
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
