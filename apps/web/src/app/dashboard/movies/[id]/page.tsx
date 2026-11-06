import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { MovieCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import { loadCategoryBrowser } from "@/server/category-access";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
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

export default function MovieCategoriesPage({ params }: PageProps) {
	return <MovieCategoriesContent params={params} />;
}

async function MovieCategoriesContent({ params }: PageProps) {
	const { id } = await params;

	const browser = await loadCategoryBrowser(id, "movie");

	if (!browser) {
		notFound();
	}

	return (
		<MovieCategorySearch
			id={id}
			playlistName={browser.playlistName}
			categories={browser.categories}
			hiddenCategories={browser.hiddenCategories}
			lockAdultCategories={browser.lockAdultCategories}
		/>
	);
}
