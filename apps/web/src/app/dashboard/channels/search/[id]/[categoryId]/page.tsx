import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import { BreadcrumbLabel } from "@/components/breadcrumb-labels";
import { CategoryItemSearch } from "@/components/category-item-search";
import { assertCategoryAvailable } from "@/server/category-access";
import { getPlaylistById } from "@/server/xtream";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
};

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { id, categoryId } = await params;
	await assertCategoryAvailable(id, "channel", categoryId);
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

	await assertCategoryAvailable(id, "channel", categoryId);
	const context = await getCategoryMetadataContext("channels", id, categoryId);

	return (
		<>
			<BreadcrumbLabel
				href={`/dashboard/channels/search/${id}/${categoryId}`}
				label={context?.categoryName}
			/>
			<CategoryItemSearch
				section="channels"
				playlistId={id}
				categoryId={categoryId}
			/>
		</>
	);
}
