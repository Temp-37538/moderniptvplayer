"use client";
import type { AllMoviesViewProps } from "@/components/types";
import { Film } from "lucide-react";
import { AllItemsView } from "@/components/all-items-view";
import { AllMoviesVirtualGrid } from "@/components/all-virtualized";

export function AllMoviesView({ movies, playlistId }: AllMoviesViewProps) {
  return (
    <AllItemsView
      icon={<Film className="size-5" />}
      title="All Movies"
      itemCount={movies.length}
      itemLabel="movies"
      searchPlaceholder="Search a movie"
      renderContent={(query) => (
        <AllMoviesVirtualGrid
          movies={movies}
          playlistId={playlistId}
          searchQuery={query}
        />
      )}
    />
  );
}
