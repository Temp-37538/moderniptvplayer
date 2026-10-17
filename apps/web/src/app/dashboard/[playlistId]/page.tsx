import { createPageMetadata, getPlaylistMetadataContext } from "@/app/metadata";
import { SavedItemsList } from "@/components/saved-items-list";
import { getFavoriteItems, getWatchLaterItems } from "@/server/user-items";
import { getPlaylistById } from "@/server/xtream";
import { ChevronRight, Clapperboard, Film, Tv } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ playlistId: string }>;
}): Promise<Metadata> {
	const { playlistId } = await params;
	const playlist = await getPlaylistMetadataContext(playlistId);

	if (!playlist) {
		return createPageMetadata({
			title: "Playlist",
			description: "Browse a saved IPTV playlist from your dashboard.",
			path: `/dashboard/${playlistId}`,
			noIndex: true,
		});
	}

	return createPageMetadata({
		title: playlist.playlistName,
		description: `Browse channels, movies, and series from the ${playlist.playlistName} playlist.`,
		path: `/dashboard/${playlistId}`,
		noIndex: true,
	});
}

export default function PlaylistHomePage({
	params,
}: {
	params: Promise<{ playlistId: string }>;
}) {
	return <PlaylistHomeContent params={params} />;
}

async function PlaylistHomeContent({
	params,
}: {
	params: Promise<{ playlistId: string }>;
}) {
	const { playlistId } = await params;
	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		notFound();
	}

	const [watchLaterItems, favoriteItems] = await Promise.all([
		getWatchLaterItems(playlistId),
		getFavoriteItems(playlistId),
	]);

	return (
		<div className="flex h-full flex-col overflow-y-auto p-6">
			<div className="w-full max-w-4xl space-y-10">
				<header className="space-y-1">
					<h1 className="text-3xl font-bold tracking-tight">
						{playlist.playlistName}
					</h1>
					<p className="text-sm text-muted-foreground">
						{playlist.username} - {playlist.serverUrl}
					</p>
				</header>

				<nav
					aria-label="Playlist library"
					className="grid gap-x-8 sm:grid-cols-3"
				>
					<Link
						href={`/dashboard/channels/${playlistId}` as Route}
						className="group flex min-h-32 flex-col justify-between py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<div className="flex items-center justify-between">
							<Tv className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
							<ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
						</div>
						<div>
							<h2 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
								Live TV
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Channels and streams
							</p>
						</div>
					</Link>
					<Link
						href={`/dashboard/movies/${playlistId}` as Route}
						className="group flex min-h-32 flex-col justify-between py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<div className="flex items-center justify-between">
							<Film className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
							<ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
						</div>
						<div>
							<h2 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
								Movies
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">Films</p>
						</div>
					</Link>
					<Link
						href={`/dashboard/series/${playlistId}` as Route}
						className="group flex min-h-32 flex-col justify-between py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<div className="flex items-center justify-between">
							<Clapperboard className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
							<ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
						</div>
						<div>
							<h2 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
								Series
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">Episodic TV</p>
						</div>
					</Link>
				</nav>

				<div className="grid gap-10 md:grid-cols-2">
					<section aria-labelledby="watch-later-heading" className="space-y-4">
						<div className="flex items-baseline justify-between gap-4">
							<h2
								id="watch-later-heading"
								className="text-lg font-semibold tracking-tight"
							>
								Watch Later{" "}
								<span className="text-sm font-normal text-muted-foreground">
									({watchLaterItems.length})
								</span>
							</h2>
							<Link
								href={`/dashboard/watchlater/${playlistId}` as Route}
								className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							>
								See all
							</Link>
						</div>
						{watchLaterItems.length > 0 ? (
							<SavedItemsList
								items={watchLaterItems.slice(0, 5)}
								playlistId={playlistId}
								variant="watchlater"
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								Nothing saved to Watch Later yet.
							</p>
						)}
					</section>

					<section aria-labelledby="favorites-heading" className="space-y-4">
						<div className="flex items-baseline justify-between gap-4">
							<h2
								id="favorites-heading"
								className="text-lg font-semibold tracking-tight"
							>
								Favorites{" "}
								<span className="text-sm font-normal text-muted-foreground">
									({favoriteItems.length})
								</span>
							</h2>
							<Link
								href={`/dashboard/favorites/${playlistId}` as Route}
								className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							>
								See all
							</Link>
						</div>
						{favoriteItems.length > 0 ? (
							<SavedItemsList
								items={favoriteItems.slice(0, 5)}
								playlistId={playlistId}
								variant="favorites"
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								No favorites saved yet.
							</p>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}
