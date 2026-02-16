import {
  ClapperboardIcon,
  FilmIcon,
  HeartIcon,
  HistoryIcon,
  Settings2Icon,
  TvIcon,
  ZapIcon,
  ListVideoIcon,
} from "lucide-react";
import type * as React from "react";

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
      id: "cmlomjick000m0suxbgb1r799",
      serverUrl: "https://dede.me",
      username: "dede",
      playlistName: "Test Playlist",
      password: "dedede",
      userId: "TKKNU27pdnvAC4etBXFVUtjrTygwDFWd",
      createdAt: new Date("2026-02-16T03:38:09.187Z"),
      updatedAt: new Date("2026-02-16T03:38:09.187Z"),
    },
    {
      id: "example-2",
      serverUrl: "https://example.com",
      username: "user2",
      playlistName: "Backup",
      password: "secret",
      userId: "user2-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Playlist[],

  navMain: [
    {
      title: "TV",
      url: "#",
      icon: <TvIcon />,
      isActive: true,
      items: [
        { title: "Live Channels", url: "#" },
        { title: "Guide", url: "#" },
        { title: "Favorites", url: "#" },
      ],
    },
    {
      title: "Movies",
      url: "#",
      icon: <FilmIcon />,
      items: [
        { title: "All Movies", url: "#" },
        { title: "Recent", url: "#" },
        { title: "Top Rated", url: "#" },
      ],
    },
    {
      title: "Series",
      url: "#",
      icon: <ClapperboardIcon />,
      items: [
        { title: "All Series", url: "#" },
        { title: "New Episodes", url: "#" },
        { title: "Continue Watching", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        { title: "General", url: "#" },
        { title: "Playlists", url: "addplaylist" },
        { title: "Playback", url: "#" },
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
