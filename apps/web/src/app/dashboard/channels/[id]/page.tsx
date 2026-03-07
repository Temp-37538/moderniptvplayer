import "server-only";
import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import type { IdPageProps as PageProps } from "@/components/types";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { TvCategorySearch } from "@/components/series-category-search";

async function getCachedChannelCategories(
	playlistId: string,
	playlist: { serverUrl: string; username: string; password: string },
) {
	"use cache";
	cacheLife("hours");
	cacheTag(`playlist-${playlistId}-channel-categories`);
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getChannelCategories();
	return categories as StandardXtreamCategory[];
}

export async function generateMetadata({ params }: PageProps) {
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

export default async function ChannelCategoriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedChannelCategories(id, playlist);

	return (
		<TvCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
