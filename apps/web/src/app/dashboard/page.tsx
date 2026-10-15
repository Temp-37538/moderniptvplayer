import { createPageMetadata } from "@/app/metadata";
import { NoPlaylistNotice } from "@/components/no-playlist-notice";
import {
	PlaylistCard,
	type PlaylistCardData,
} from "@/components/playlist-card";
import { Button } from "@/components/ui/button";
import { fetchPlaylists } from "@/server/queries";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Dashboard",
	description:
		"Open your private dashboard to manage playlists and browse your library.",
	path: "/dashboard",
	noIndex: true,
});

async function Page() {
	const playlists = await fetchPlaylists();

	const safePlaylists: PlaylistCardData[] = playlists.map((p) => ({
		id: p.id,
		playlistName: p.playlistName,
		serverUrl: p.serverUrl,
		username: p.username,
		createdAt: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
			new Date(p.createdAt),
		),
	}));

	if (safePlaylists.length === 0) {
		return (
			<div className="flex h-full flex-col overflow-y-auto">
				<NoPlaylistNotice />
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Your playlists</h1>
				<Button
					nativeButton={false}
					render={<Link href="/dashboard/addplaylist" />}
				>
					<PlusIcon className="size-4" />
					Add playlist
				</Button>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{safePlaylists.map((playlist) => (
					<PlaylistCard key={playlist.id} {...playlist} />
				))}
			</div>
		</div>
	);
}

export default Page;
