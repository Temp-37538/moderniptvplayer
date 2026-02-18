import "server-only"; 
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { SeriesCategorySearch } from "../../../../components/series-category-search";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function SeriesCategoriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getShowCategories();
	const typedCategories = categories as StandardXtreamCategory[];
	
	return (
		<SeriesCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
