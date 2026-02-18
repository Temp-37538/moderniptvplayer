import "server-only";

import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { MovieCategorySearch } from "@/components/series-category-search";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function MovieCategoriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getMovieCategories();

	const typedCategories = categories as StandardXtreamCategory[];

	return (
		<MovieCategorySearch
			id={id}
			playlistName={playlist.playlistName}
			categories={typedCategories}
		/>
	);
}
