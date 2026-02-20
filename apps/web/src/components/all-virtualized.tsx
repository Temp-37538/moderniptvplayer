"use client";
import Link from "next/link";
import { List, type RowComponentProps } from "react-window";
import { useEffect, useRef, useState } from "react";
import type {
  StandardXtreamChannel,
  StandardXtreamMovieListing,
  StandardXtreamShow,
} from "@iptv/xtream-api/standardized";
import { Film, Radio, Star, Tv } from "lucide-react";
import type {
  ChannelRowProps,
  MovieRowProps,
  SeriesRowProps,
  Size,
} from "@/components/types";

const CHANNEL_COLUMNS = [
  { minWidth: 1280, columns: 4 },
  { minWidth: 1024, columns: 3 },
  { minWidth: 640, columns: 2 },
  { minWidth: 0, columns: 1 },
];

const MEDIA_COLUMNS = [
  { minWidth: 1280, columns: 6 },
  { minWidth: 1024, columns: 5 },
  { minWidth: 768, columns: 4 },
  { minWidth: 640, columns: 3 },
  { minWidth: 0, columns: 2 },
];

const CHANNEL_GAP_PX = 12;
const MEDIA_GAP_PX = 16;
const MEDIA_TITLE_HEIGHT = 40;
const CHANNEL_CARD_HEIGHT = 84;

function toLowerCaseSafe(value: unknown) {
  return value === undefined || value === null
    ? ""
    : String(value).toLowerCase();
}

function useContainerSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function getColumns(
  width: number,
  config: Array<{ minWidth: number; columns: number }>,
) {
  for (const entry of config) {
    if (width >= entry.minWidth) {
      return entry.columns;
    }
  }
  return config[config.length - 1]?.columns ?? 1;
}

function getMediaRowHeight(width: number, columns: number) {
  if (columns <= 0) return 0;
  const columnWidth = Math.max(
    (width - MEDIA_GAP_PX * (columns - 1)) / columns,
    120,
  );
  const posterHeight = columnWidth * 1.5;
  return Math.ceil(posterHeight + MEDIA_TITLE_HEIGHT + MEDIA_GAP_PX);
}

function ChannelRow({
  index,
  style,
  channels,
  columns,
  playlistId,
}: RowComponentProps<ChannelRowProps>) {
  const startIndex = index * columns;
  const rowItems = channels.slice(startIndex, startIndex + columns);

  return (
    <div
      style={{
        ...style,
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${CHANNEL_GAP_PX}px`,
      }}
    >
      {rowItems.map((channel) => {
        const categoryId = channel.categoryIds?.[0] ?? "0";
        return (
          <Link
            key={channel.id}
            href={`/dashboard/channels/${playlistId}/${categoryId}/${channel.id}`}
            className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center justify-center size-12 rounded-lg bg-muted overflow-hidden shrink-0">
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="size-full object-contain p-1"
                />
              ) : (
                <Radio className="size-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                {channel.name}
              </h3>
              {channel.number > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ch. {channel.number}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MovieRow({
  index,
  style,
  movies,
  columns,
  playlistId,
}: RowComponentProps<MovieRowProps>) {
  const startIndex = index * columns;
  const rowItems = movies.slice(startIndex, startIndex + columns);

  return (
    <div
      style={{
        ...style,
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${MEDIA_GAP_PX}px`,
      }}
    >
      {rowItems.map((movie) => {
        const categoryId = movie.categoryIds?.[0] ?? "0";
        return (
          <Link
            key={movie.id}
            href={`/dashboard/movies/${playlistId}/${categoryId}/${movie.id}`}
            className="group"
          >
            <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.name}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center size-full text-muted-foreground">
                  <Film className="size-10 opacity-50" />
                </div>
              )}
              {movie.voteAverage > 0 && (
                <div className="absolute top-2 right-2 rounded-md bg-amber-500/90 text-amber-50 text-xs font-semibold px-2 py-1 flex items-center gap-1">
                  <Star className="size-3 fill-amber-50" />
                  {Number(movie.voteAverage).toFixed(1)}
                </div>
              )}
            </div>
            <h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {movie.name}
            </h3>
          </Link>
        );
      })}
    </div>
  );
}

function SeriesRow({
  index,
  style,
  shows,
  columns,
  playlistId,
}: RowComponentProps<SeriesRowProps>) {
  const startIndex = index * columns;
  const rowItems = shows.slice(startIndex, startIndex + columns);

  return (
    <div
      style={{
        ...style,
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${MEDIA_GAP_PX}px`,
      }}
    >
      {rowItems.map((show) => {
        const categoryId = show.categoryIds?.[0] ?? "0";
        return (
          <Link
            key={show.id}
            href={`/dashboard/series/${playlistId}/${categoryId}/${show.id}`}
            className="group"
          >
            <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
              {show.poster ? (
                <img
                  src={show.poster}
                  alt={show.name}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center size-full text-muted-foreground">
                  <Tv className="size-10 opacity-50" />
                </div>
              )}
              {show.voteAverage > 0 && (
                <div className="absolute top-2 right-2 rounded-md bg-amber-500/90 text-amber-50 text-xs font-semibold px-2 py-1 flex items-center gap-1">
                  <Star className="size-3 fill-amber-50" />
                  {Number(show.voteAverage).toFixed(1)}
                </div>
              )}
            </div>
            <h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {show.name}
            </h3>
          </Link>
        );
      })}
    </div>
  );
}

export function AllChannelsVirtualList({
  channels,
  playlistId,
  searchQuery = "",
}: {
  channels: StandardXtreamChannel[];
  playlistId: string;
  searchQuery?: string;
}) {
  const { ref, size } = useContainerSize();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredChannels = normalizedQuery
    ? channels.filter((channel) => {
        const nameMatch = toLowerCaseSafe(channel.name).includes(
          normalizedQuery,
        );
        const numberMatch =
          channel.number > 0 &&
          String(channel.number).includes(normalizedQuery);
        return nameMatch || numberMatch;
      })
    : channels;
  const columns = getColumns(size.width, CHANNEL_COLUMNS);
  const rowCount = Math.ceil(filteredChannels.length / columns);

  return (
    <div className="flex h-full flex-col gap-4">
      {filteredChannels.length > 0 ? (
        <div ref={ref} className="h-full pb-15 flex-1">
          <List
            rowComponent={ChannelRow}
            rowCount={rowCount}
            rowHeight={CHANNEL_CARD_HEIGHT + CHANNEL_GAP_PX}
            rowProps={{ channels: filteredChannels, columns, playlistId }}
            overscanCount={2}
            className="no-scrollbar size-full"
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No channels found.
        </div>
      )}
    </div>
  );
}

export function AllMoviesVirtualGrid({
  movies,
  playlistId,
  searchQuery = "",
}: {
  movies: StandardXtreamMovieListing[];
  playlistId: string;
  searchQuery?: string;
}) {
  const { ref, size } = useContainerSize();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMovies = normalizedQuery
    ? movies.filter((movie) =>
        toLowerCaseSafe(movie.name).includes(normalizedQuery),
      )
    : movies;
  const columns = getColumns(size.width, MEDIA_COLUMNS);
  const rowCount = Math.ceil(filteredMovies.length / columns);
  const rowHeight = getMediaRowHeight(size.width, columns);

  if (filteredMovies.length === 0 && normalizedQuery) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No movies found.
      </div>
    );
  }

  return (
    <div ref={ref} className="h-full pb-15 flex-1">
      <List
        rowComponent={MovieRow}
        rowCount={rowCount}
        rowHeight={rowHeight}
        rowProps={{ movies: filteredMovies, columns, playlistId }}
        overscanCount={2}
        className="no-scrollbar size-full"
      />
    </div>
  );
}

export function AllSeriesVirtualGrid({
  shows,
  playlistId,
  searchQuery = "",
}: {
  shows: Array<Omit<StandardXtreamShow, "seasons">>;
  playlistId: string;
  searchQuery?: string;
}) {
  const { ref, size } = useContainerSize();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredShows = normalizedQuery
    ? shows.filter((show) =>
        toLowerCaseSafe(show.name).includes(normalizedQuery),
      )
    : shows;
  const columns = getColumns(size.width, MEDIA_COLUMNS);
  const rowCount = Math.ceil(filteredShows.length / columns);
  const rowHeight = getMediaRowHeight(size.width, columns);

  if (filteredShows.length === 0 && normalizedQuery) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No series found.
      </div>
    );
  }

  return (
    <div ref={ref} className="h-full pb-15 flex-1">
      <List
        rowComponent={SeriesRow}
        rowCount={rowCount}
        rowHeight={rowHeight}
        rowProps={{ shows: filteredShows, columns, playlistId }}
        overscanCount={2}
        className="no-scrollbar size-full"
      />
    </div>
  );
}
