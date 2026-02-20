import "server-only";
import type { IdPageProps as PageProps } from "@/components/types";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamMovieListing } from "@iptv/xtream-api/standardized";
import { AllMoviesView } from "@/components/all-movies-view";
import { EmptyState } from "@/components/empty-state";

export default async function AllMoviesPage({ params }: PageProps) {
  const { id } = await params;

  const playlist = await getPlaylistById(id);

  if (!playlist) {
    notFound();
  }

  const xtream = createXtreamClient(playlist);
  const movies = (await xtream.getMovies()) as StandardXtreamMovieListing[];

  return (
    <div className="h-full">
      {movies.length > 0 ? (
        <AllMoviesView movies={movies} playlistId={id} />
      ) : (
        <EmptyState
          title="No movies in this playlist"
          description="Try another playlist."
        />
      )}
    </div>
  );
}
