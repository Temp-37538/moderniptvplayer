import { createPageMetadata } from "@/app/metadata";
import { ContinueWatching } from "@/components/continue-watching";
import { NoPlaylistNotice } from "@/components/no-playlist-notice";
import {
	PlaylistCard,
	type PlaylistCardData,
} from "@/components/playlist-card";
import { ContinueWatchingSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPlaylists } from "@/server/queries";
import { getPlaylistStatus, type PlaylistStatus } from "@/server/xtream";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Dashboard",
	description:
		"Open your private dashboard to manage playlists and browse your library.",
	path: "/dashboard",
	noIndex: true,
});

const subscriptionDateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
});

function formatSubscriptionStatus(status: PlaylistStatus) {
	const label = status.status || "Unknown";
	const isExpired = label.toLowerCase() === "expired";
	const expiry = status.expDate
		? subscriptionDateFormatter.format(new Date(status.expDate * 1000))
		: null;

	return {
		isExpired,
		text: expiry ? `${label} ${isExpired ? "on" : "until"} ${expiry}` : label,
	};
}

async function PlaylistSubscriptionStatus({
	playlistId,
}: {
	playlistId: string;
}) {
	try {
		const status = await getPlaylistStatus(playlistId);
		const { isExpired, text } = formatSubscriptionStatus(status);

		return (
			<span
				className={
					isExpired ? "font-semibold text-red-600 dark:text-red-400" : undefined
				}
			>
				{text}
			</span>
		);
	} catch {
		return null;
	}
}

function SubscriptionStatusSkeleton() {
	return <Skeleton className="h-3 w-28" />;
}

async function Page() {
	const playlists = await fetchPlaylists();

	const safePlaylists: PlaylistCardData[] = playlists.map((p) => ({
		id: p.id,
		source: p.source,
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
		<div className="flex h-full flex-col overflow-y-auto p-6">
			<div className="w-full space-y-8">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
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
						<PlaylistCard
							key={playlist.id}
							{...playlist}
							subscriptionStatus={
								<Suspense fallback={<SubscriptionStatusSkeleton />}>
									<PlaylistSubscriptionStatus playlistId={playlist.id} />
								</Suspense>
							}
						/>
					))}
				</div>
				<Suspense fallback={<ContinueWatchingSkeleton />}>
					<ContinueWatching />
				</Suspense>
			</div>
		</div>
	);
}

export default Page;
