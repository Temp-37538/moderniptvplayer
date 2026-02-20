import type {
  StandardXtreamCategory,
  StandardXtreamChannel,
  StandardXtreamMovieListing,
  StandardXtreamShow,
} from "@iptv/xtream-api/standardized";
import {
  ClapperboardIcon,
  FilmIcon,
  HeartIcon,
  HistoryIcon,
  TvIcon,
} from "lucide-react";
import type * as React from "react";

export type CategorySearchProps = {
  id: string;
  playlistName: string;
  categories: StandardXtreamCategory[];
};

export const NO_PLAYLIST_ID = "NoPlaylisfreàçuhgpzfiru_thgrpituehgriptgrt";

export interface Playlist {
  id: string;
  serverUrl: string;
  username: string;
  playlistName: string;
  password: string;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NavItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  isActive?: boolean;
  items: Array<{ title: string; url: string }>;
}

export interface Project {
  name: string;
  url: string;
  icon: React.ReactNode;
}

export const sidebarData = {
  playlists: [
    {
      id: NO_PLAYLIST_ID,
      serverUrl: "No Playlist",
      username: "No Playlist",
      playlistName: "No Playlist",
      password: "No Playlist",
      userId: "No Playlist",
      createdAt: new Date("2026-02-16T03:38:09.187Z"),
      updatedAt: new Date("2026-02-16T03:38:09.187Z"),
    },
  ] as Playlist[],

  navMain: [
    {
      title: "TV",
      url: "#",
      icon: <TvIcon />,
      isActive: true,
      items: [
        { title: "Channels categories", url: "/dashboard/channels" },
        { title: "All Channels", url: "/dashboard/channels/all" },
      ],
    },
    {
      title: "Movies",
      url: "#",
      icon: <FilmIcon />,
      items: [
        { title: "Movies categories", url: "/dashboard/movies" },
        { title: "All movies", url: "/dashboard/movies/all" },
      ],
    },
    {
      title: "Series",
      url: "#",
      icon: <ClapperboardIcon />,
      items: [
        { title: "Series categories", url: "/dashboard/series" },
        { title: "All Series", url: "/dashboard/series/all" },
      ],
    },
  ] as NavItem[],

  projects: [
    {
      name: "Watch Later",
      url: "/dashboard/watchlater",
      icon: <HistoryIcon />,
    },
    { name: "Favorites", url: "/dashboard/favorites", icon: <HeartIcon /> },
  ] as Project[],
};

export type xtreamFormData = {
  username: string;
  password: string;
  serverUrl: string;
  playlistName: string;
};

export type FormState = {
  errors: {
    properties?:
      | {
          username?:
            | {
                errors: string[];
              }
            | undefined;
          password?:
            | {
                errors: string[];
              }
            | undefined;
          serverUrl?:
            | {
                errors: string[];
              }
            | undefined;
          playlistName?:
            | {
                errors: string[];
              }
            | undefined;
        }
      | undefined;
  };
  inputs?: xtreamFormData;
  success: boolean;
  message?: string;
};

export type PageProps = {
  params: Promise<{ id: string; categoryId: string; showId: string }>;
};

export type ItemType = "channel" | "movie" | "series";

export type UserItemStatus = {
  isWatchLater: boolean;
  isFavorite: boolean;
};

// ─── Component props types ────────────────────────────────────────────────────

export type AllChannelsViewProps = {
  channels: StandardXtreamChannel[];
  playlistId: string;
};

export type AllItemsViewProps = {
  icon: React.ReactNode;
  title: string;
  itemCount: number;
  itemLabel: string;
  searchPlaceholder: string;
  renderContent: (searchQuery: string) => React.ReactNode;
};

export type AllMoviesViewProps = {
  movies: StandardXtreamMovieListing[];
  playlistId: string;
};

export type AllSeriesViewProps = {
  shows: Array<Omit<StandardXtreamShow, "seasons">>;
  playlistId: string;
};

export type Size = { width: number; height: number };

export type ChannelRowProps = {
  channels: StandardXtreamChannel[];
  columns: number;
  playlistId: string;
};

export type MovieRowProps = {
  movies: StandardXtreamMovieListing[];
  columns: number;
  playlistId: string;
};

export type SeriesRowProps = {
  shows: Array<Omit<StandardXtreamShow, "seasons">>;
  columns: number;
  playlistId: string;
};

export type CopyStreamButtonProps = {
  url: string;
};

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
};

export type ItemActionButtonsProps = {
  playlistId: string;
  itemId: string;
  itemType: ItemType;
  itemName: string;
  itemUrl: string;
  isWatchLater: boolean;
  isFavorite: boolean;
};

export type PaginationNavProps = {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  /** Base URL without `?page=` query param, e.g. `/dashboard/channels/abc/123` */
  baseUrl: string;
};

export type RemoveItemButtonProps = {
  itemId: string;
  itemType: ItemType;
  itemName: string;
  itemUrl: string;
  playlistId: string;
  variant: "watchlater" | "favorites";
};

export type SavedItem = {
  id: string;
  itemId: string;
  itemType: string;
  itemName: string;
  itemUrl: string;
  playlistId: string;
  createdAt: Date;
};

export type SavedItemsListProps = {
  items: SavedItem[];
  playlistId: string;
  variant: "watchlater" | "favorites";
};

export type CategorySearchBaseProps = CategorySearchProps & {
  title: string;
  placeholder: string;
  emptyTitle: string;
  emptyDescription: string;
  hrefPrefix: string;
  Icon: React.ComponentType<{ className?: string }>;
};

export type SimpleFormState = {
  errors: Record<string, string>;
  success: boolean;
};

export type PlaylistSection =
  | "channels"
  | "movies"
  | "series"
  | "watchlater"
  | "favorites"
  | null;

// ─── Named page route props ────────────────────────────────────────────────────

export type PlaylistIdPageProps = {
  params: Promise<{ playlistId: string }>;
};

export type IdPageProps = {
  params: Promise<{ id: string }>;
};

export type IdCategoryPageProps = {
  params: Promise<{ id: string; categoryId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export type ChannelDetailPageProps = {
  params: Promise<{ id: string; categoryId: string; channelId: string }>;
};

export type MovieDetailPageProps = {
  params: Promise<{ id: string; categoryId: string; movieId: string }>;
};
