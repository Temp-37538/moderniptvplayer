"use client";
import type { AllSeriesViewProps } from "@/components/types";
import { Tv } from "lucide-react";
import { AllItemsView } from "@/components/all-items-view";
import { AllSeriesVirtualGrid } from "@/components/all-virtualized";

export function AllSeriesView({ shows, playlistId }: AllSeriesViewProps) {
  return (
    <AllItemsView
      icon={<Tv className="size-5" />}
      title="All Series"
      itemCount={shows.length}
      itemLabel="series"
      searchPlaceholder="Search a serie"
      renderContent={(query) => (
        <AllSeriesVirtualGrid
          shows={shows}
          playlistId={playlistId}
          searchQuery={query}
        />
      )}
    />
  );
}
