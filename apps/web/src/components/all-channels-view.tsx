"use client";
import type { AllChannelsViewProps } from "@/components/types";
import { Radio } from "lucide-react";
import { AllItemsView } from "@/components/all-items-view";
import { AllChannelsVirtualList } from "@/components/all-virtualized";

export function AllChannelsView({
  channels,
  playlistId,
}: AllChannelsViewProps) {
  return (
    <AllItemsView
      icon={<Radio className="size-5" />}
      title="All Channels"
      itemCount={channels.length}
      itemLabel="channels"
      searchPlaceholder="Search a channel"
      renderContent={(query) => (
        <AllChannelsVirtualList
          channels={channels}
          playlistId={playlistId}
          searchQuery={query}
        />
      )}
    />
  );
}
