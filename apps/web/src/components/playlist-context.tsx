"use client";
import { createContext, useContext } from "react";
import type { Playlist } from "./types";

const PlaylistContext = createContext<Playlist[]>([]);

export function PlaylistProvider({
	playlists,
	children,
}: {
	playlists: Playlist[];
	children: React.ReactNode;
}) {
	return <PlaylistContext value={playlists}>{children}</PlaylistContext>;
}

export function usePlaylists() {
	return useContext(PlaylistContext);
}
