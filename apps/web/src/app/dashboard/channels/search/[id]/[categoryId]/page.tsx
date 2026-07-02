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
	const context = await getCategoryMetadataContext("channels", id, categoryId);
	const categoryTitle = context?.categoryName ?? "Channel Search";

	return createPageMetadata({
		title: `Search ${categoryTitle}`,
		description: context?.playlist
			? `Search channels in ${categoryTitle.toLowerCase()} from ${context.playlist.playlistName}.`
			: "Search channels within a playlist category.",
		path: `/dashboard/channels/search/${id}/${categoryId}`,
		noIndex: true,
	});
}

export default function ChannelCategorySearchPage({ params }: PageProps) {
	return <ChannelCategorySearchContent params={params} />;
}

async function ChannelCategorySearchContent({ params }: PageProps) {
	const { id, categoryId } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	return (
		<CategoryItemSearch
			section="channels"
			playlistId={id}
			categoryId={categoryId}
		/>
	);
}
