import "server-only";
import { CategoryItemSearch } from "@/components/category-item-search";
import { getPlaylistById } from "@/server/xtream";
import { notFound } from "next/navigation";

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
};

export default async function MovieCategorySearchPage({ params }: PageProps) {
	const { id, categoryId } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	return (
		<CategoryItemSearch
			section="movies"
			playlistId={id}
			categoryId={categoryId}
		/>
	);
}
