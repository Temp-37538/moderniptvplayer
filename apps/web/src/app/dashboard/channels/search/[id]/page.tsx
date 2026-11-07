import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SearchTvCategorySearch } from "@/components/series-category-search";
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
			title: "Search Channel Categories",
			description: "Search TV categories from a saved playlist.",
			path: `/dashboard/channels/search/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: "Search Channel Categories",
		description: `Search the live TV categories available in ${playlist.playlistName}.`,
		path: `/dashboard/channels/search/${id}`,
		noIndex: true,
	});
}

export default function ChannelSearchCategoriesPage({ params }: PageProps) {
	return <ChannelSearchCategoriesContent params={params} />;
}

async function ChannelSearchCategoriesContent({ params }: PageProps) {
	const { id } = await params;
	const browser = await loadCategoryBrowser(id, "channel");

	if (!browser) {
		notFound();
	}

	return (
		<SearchTvCategorySearch
			id={id}
			playlistName={browser.playlistName}
			categories={browser.categories}
			hiddenCategories={browser.hiddenCategories}
			lockAdultCategories={browser.lockAdultCategories}
		/>
	);
}
