import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import type { IdPageProps as PageProps } from "@/components/types";
import type { Metadata } from "next";
import { getCachedSeriesCategories } from "@/server/cached-content";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";
import { SeriesCategorySearch } from "@/components/series-category-search";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params;
	const playlist = await getPlaylistMetadataContext(id);

	if (!playlist) {
		return createPageMetadata({
			title: "Series Categories",
			description: "Browse series categories from a saved playlist.",
			path: `/dashboard/series/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: "Series Categories",
		description: `Browse series categories available in ${playlist.playlistName}.`,
		path: `/dashboard/series/${id}`,
		noIndex: true,
	});
}

export default function SeriesCategoriesPage({ params }: PageProps) {
	return <SeriesCategoriesContent params={params} />;
}

async function SeriesCategoriesContent({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedSeriesCategories(id, playlist);

	return (
		<SeriesCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
