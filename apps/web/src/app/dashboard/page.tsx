import { createPageMetadata } from "@/app/metadata";
import { ContinueWatching } from "@/components/continue-watching";
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
import { Suspense } from "react";

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
		<div className="flex h-full flex-col overflow-y-auto p-4">
			<div className="w-full max-w-4xl">
				<Suspense fallback={null}>
					<ContinueWatching />
				</Suspense>
				<div className="mb-6 flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-3xl font-bold tracking-tight">
							Your playlists
						</h1>
						<p className="text-base text-muted-foreground">
							Manage your sources and open your library.
						</p>
					</div>
					<Button
						nativeButton={false}
						render={<Link href="/dashboard/addplaylist" />}
					>
						<PlusIcon className="size-4" />
						Add playlist
					</Button>
				</div>
				<div className="divide-y divide-border/60">
					{safePlaylists.map((playlist) => (
						<PlaylistCard key={playlist.id} {...playlist} />
					))}
				</div>
			</div>
		</div>
	);
}

export default Page;
