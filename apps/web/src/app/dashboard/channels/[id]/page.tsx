import "server-only";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { TvCategorySearch } from "@/components/series-category-search";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function ChannelCategoriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getChannelCategories();

	const typedCategories = categories as StandardXtreamCategory[];

	return (
		<TvCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
