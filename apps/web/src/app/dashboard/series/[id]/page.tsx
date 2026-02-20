import "server-only";
import type { IdPageProps as PageProps } from "@/components/types";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { SeriesCategorySearch } from "@/components/series-category-search";

async function getCachedShowCategories(
  playlistId: string,
  playlist: { serverUrl: string; username: string; password: string },
) {
  "use cache";
  cacheLife("hours");
  cacheTag(`playlist-${playlistId}-series-categories`);
  const xtream = createXtreamClient(playlist);
  const categories = await xtream.getShowCategories();
  return categories as StandardXtreamCategory[];
}

export default async function SeriesCategoriesPage({ params }: PageProps) {
  const { id } = await params;

  const playlist = await getPlaylistById(id);

  if (!playlist) {
    notFound();
  }

  const typedCategories = await getCachedShowCategories(id, playlist);

  return (
    <SeriesCategorySearch
      id={id}
      playlistName={playlist.playlistName}
      categories={typedCategories}
    />
  );
}
