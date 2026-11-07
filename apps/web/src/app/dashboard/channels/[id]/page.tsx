import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { TvCategorySearch } from "@/components/series-category-search";
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
			title: "Channel Categories",
			description: "Browse TV channel categories from a saved playlist.",
			path: `/dashboard/channels/${id}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: `Channel Categories`,
		description: `Browse live TV categories available in ${playlist.playlistName}.`,
		path: `/dashboard/channels/${id}`,
		noIndex: true,
	});
}

export default function ChannelCategoriesPage({ params }: PageProps) {
	return <ChannelCategoriesContent params={params} />;
}

async function ChannelCategoriesContent({ params }: PageProps) {
	const { id } = await params;

	const browser = await loadCategoryBrowser(id, "channel");

	if (!browser) {
		notFound();
	}

	return (
		<TvCategorySearch
			id={id}
			playlistName={browser.playlistName}
			categories={browser.categories}
			hiddenCategories={browser.hiddenCategories}
			lockAdultCategories={browser.lockAdultCategories}
		/>
	);
}
