import "server-only";
import type { IdPageProps as PageProps } from "@/components/types";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";
import { AllChannelsView } from "@/components/all-channels-view";
import { EmptyState } from "@/components/empty-state";

export default async function AllChannelsPage({ params }: PageProps) {
  const { id } = await params;
  const playlist = await getPlaylistById(id);

  if (!playlist) {
    notFound();
  }

  const xtream = createXtreamClient(playlist);
  const channels = (await xtream.getChannels()) as StandardXtreamChannel[];

  return (
    <div className="h-full">
      {channels.length > 0 ? (
        <AllChannelsView channels={channels} playlistId={id} />
      ) : (
        <EmptyState
          title="No channels in this playlist"
          description="Try another playlist."
        />
      )}
    </div>
  );
}
