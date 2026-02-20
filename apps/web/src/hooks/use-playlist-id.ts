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
const NON_PLAYLIST_ROUTES = ["addplaylist", "account"] as const;
const ALL_SUB_ROUTES = ["all"] as const;

export function usePlaylistIdFromPath() {
	const pathname = usePathname();
	return parsePlaylistFromPath(pathname);
}

export function parsePlaylistFromPath(pathname: string) {
	const parts = pathname.split("/").filter(Boolean);

	if (parts.length >= 3 && PLAYLIST_SECTIONS.includes(parts[1] as any)) {
		if (ALL_SUB_ROUTES.includes(parts[2] as any)) {
			return {
				section: parts[1] as PlaylistSection,
				playlistId: parts[3] ?? null,
			};
		}
		return {
			section: parts[1] as PlaylistSection,
			playlistId: parts[2],
		};
	}

	if (
		parts.length === 2 &&
		!PLAYLIST_SECTIONS.includes(parts[1] as any) &&
		!NON_PLAYLIST_ROUTES.includes(parts[1] as any)
	) {
		return {
			section: null as PlaylistSection,
			playlistId: parts[1],
		};
	}

	const hasValidSection =
		parts.length >= 2 && PLAYLIST_SECTIONS.includes(parts[1] as any);

	return {
		section: hasValidSection ? (parts[1] as PlaylistSection) : null,
		playlistId: null as string | null,
	};
}

export { PLAYLIST_SECTIONS, NON_PLAYLIST_ROUTES, ALL_SUB_ROUTES };
