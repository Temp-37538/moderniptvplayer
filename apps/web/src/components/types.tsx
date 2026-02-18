import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import {
  ClapperboardIcon,
  FilmIcon,
  HeartIcon,
  HistoryIcon,
  TvIcon,
  ZapIcon
} from "lucide-react";
import type * as React from "react";

export type CategorySearchProps = {
	id: string;
	playlistName: string;
	categories: StandardXtreamCategory[];
};

export type SeriesCategorySearchProps = CategorySearchProps;


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
      id: "NoPlaylisfreàçuhgpzfiru_thgrpituehgriptgrt",
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
        { title: "Live Channels", url: "/dashboard/channels" },
        { title: "Guide", url: "" },
        { title: "Favorites", url: "" },
      ],
    },
    {
      title: "Movies",
      url: "#",
      icon: <FilmIcon />,
      items: [
        { title: "All Movies", url: "/dashboard/movies" },
        { title: "Recent", url: "" },
        { title: "Top Rated", url: "" },
      ],
    },
    {
      title: "Series",
      url: "#",
      icon: <ClapperboardIcon />,
      items: [
        { title: "All Series", url: "/dashboard/series" },
        { title: "New Episodes", url: "" },
        { title: "Continue Watching", url: "" },
      ],
    }, 
  ] as NavItem[],

  projects: [
    { name: "Watch Later", url: "#", icon: <HistoryIcon /> },
    { name: "Favorites", url: "#", icon: <HeartIcon /> },
    { name: "Trending", url: "#", icon: <ZapIcon /> },
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
