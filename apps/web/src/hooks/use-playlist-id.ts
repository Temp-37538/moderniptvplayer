"use client";
import type { PlaylistSection } from "@/components/types";
import { usePathname } from "next/navigation";

const PLAYLIST_SECTIONS = [
	"channels",
	"movies",
	"series",
	"watchlater",
	"favorites",
] as const;
const NON_PLAYLIST_ROUTES = ["addplaylist", "account", "settings"] as const;
const SEARCH_SUB_ROUTES = ["search"] as const;

type ParsedPlaylistPath = {
	section: PlaylistSection;
	playlistId: string | null;
};

type PlaylistSectionValue = (typeof PLAYLIST_SECTIONS)[number];
type NonPlaylistRoute = (typeof NON_PLAYLIST_ROUTES)[number];
type SearchSubRoute = (typeof SEARCH_SUB_ROUTES)[number];

function isPlaylistSection(value: string): value is PlaylistSectionValue {
	return PLAYLIST_SECTIONS.includes(value as PlaylistSectionValue);
}

function isNonPlaylistRoute(value: string): value is NonPlaylistRoute {
	return NON_PLAYLIST_ROUTES.includes(value as NonPlaylistRoute);
}

function isSearchSubRoute(value: string): value is SearchSubRoute {
	return SEARCH_SUB_ROUTES.includes(value as SearchSubRoute);
}

export function usePlaylistIdFromPath() {
	const pathname = usePathname();
	return parsePlaylistFromPath(pathname);
}

function parsePlaylistFromPath(pathname: string): ParsedPlaylistPath {
	const parts = pathname.split("/").filter(Boolean);

	if (parts.length >= 3 && isPlaylistSection(parts[1])) {
		if (parts[2] && isSearchSubRoute(parts[2])) {
			return {
				section: parts[1],
				playlistId: parts[3] ?? null,
			};
		}
		return {
			section: parts[1],
			playlistId: parts[2] ?? null,
		};
	}

	if (
		parts.length === 2 &&
		!isPlaylistSection(parts[1]) &&
		!isNonPlaylistRoute(parts[1])
	) {
		return {
			section: null,
			playlistId: parts[1],
		};
	}

	if (parts.length >= 2 && isPlaylistSection(parts[1])) {
		return {
			section: parts[1],
			playlistId: null,
		};
	}

	return {
		section: null,
		playlistId: null,
	};
}

export { PLAYLIST_SECTIONS, NON_PLAYLIST_ROUTES, SEARCH_SUB_ROUTES };
