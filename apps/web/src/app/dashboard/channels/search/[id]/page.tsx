import "server-only";
import { SearchTvCategorySearch } from "@/components/series-category-search";
import type { IdPageProps as PageProps } from "@/components/types";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

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

export default async function ChannelSearchCategoriesPage({
	params,
}: PageProps) {
	const { id } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const typedCategories = await getCachedChannelCategories(id, playlist);

	return (
		<SearchTvCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
