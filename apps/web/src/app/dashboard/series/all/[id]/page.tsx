import "server-only";
import type { IdPageProps as PageProps } from "@/components/types";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { AllSeriesView } from "@/components/all-series-view";
import { EmptyState } from "@/components/empty-state";

export default async function AllSeriesPage({ params }: PageProps) {
  const { id } = await params;

  const playlist = await getPlaylistById(id);

  if (!playlist) {
    notFound();
  }

  const xtream = createXtreamClient(playlist);
  const shows = (await xtream.getShows()) as unknown as Array<
    Omit<StandardXtreamShow, "seasons">
  >;

  return (
    <div className="h-full">
      {shows.length > 0 ? (
        <AllSeriesView shows={shows} playlistId={id} />
      ) : (
        <EmptyState
          title="No series in this playlist"
          description="Try another playlist."
        />
      )}
    </div>
  );
}
