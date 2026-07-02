import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import { CategoryItemSearch } from "@/components/category-item-search";
import type { Metadata } from "next";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id, categoryId } = await params;
	const context = await getCategoryMetadataContext("series", id, categoryId);
	const categoryTitle = context?.categoryName ?? "Series Search";

	return createPageMetadata({
		title: `Search ${categoryTitle}`,
		description: context?.playlist
			? `Search series in ${categoryTitle.toLowerCase()} from ${context.playlist.playlistName}.`
			: "Search series within a playlist category.",
		path: `/dashboard/series/search/${id}/${categoryId}`,
		noIndex: true,
	});
}

export default function SeriesCategorySearchPage({ params }: PageProps) {
	return <SeriesCategorySearchContent params={params} />;
}

async function SeriesCategorySearchContent({ params }: PageProps) {
	const { id, categoryId } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	return (
		<CategoryItemSearch
			section="series"
			playlistId={id}
			categoryId={categoryId}
		/>
	);
}
