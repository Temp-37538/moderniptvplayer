import { createPageMetadata } from "@/app/metadata";
import { ContinueWatching } from "@/components/continue-watching";
import {
	PlaylistCard,
	type PlaylistCardData,
} from "@/components/playlist-card";
import { ContinueWatchingSkeleton, HomeSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_PLAYLIST_COOKIE } from "@/server/active-playlist";
import { fetchPlaylists } from "@/server/queries";
import { getPlaylistStatus, type PlaylistStatus } from "@/server/xtream";
import { BookmarkIcon, HeartIcon, PlusIcon, SearchIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Dashboard",
	description:
		"Open your private dashboard to manage playlists and browse your library.",
	path: "/dashboard",
	noIndex: true,
});

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function formatSubscriptionStatus(status: PlaylistStatus) {
	const label = status.status || "Unknown";
	const lower = label.toLowerCase();
	const isExpired = lower === "expired";
	const expiry = status.expDate
		? dateFormatter.format(new Date(status.expDate * 1000))
		: null;

	if (isExpired) {
		return { isProblem: true, text: expiry ? `Expired ${expiry}` : "Expired" };
	}
	if (lower === "active") {
		return { isProblem: false, text: expiry ? `Expires ${expiry}` : "Active" };
	}
	return {
		isProblem: false,
		text: expiry ? `${label} until ${expiry}` : label,
	};
}

async function PlaylistSubscriptionStatus({
	playlistId,
}: {
	playlistId: string;
}) {
	try {
		const status = await getPlaylistStatus(playlistId);
		const { isProblem, text } = formatSubscriptionStatus(status);

		if (!isProblem) {
			return <span>{text}</span>;
		}
		return (
			<span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
				<span aria-hidden className="size-1.5 rounded-full bg-current" />
				{text}
			</span>
		);
	} catch {
		return (
			<span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
				<span aria-hidden className="size-1.5 rounded-full bg-current" />
				Status unavailable
			</span>
		);
	}
}

function SectionHeading({
	id,
	title,
	description,
	action,
}: {
	id: string;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
			<div>
				<h2 id={id} className="font-serif text-2xl tracking-tight">
					{title}
				</h2>
				{description ? (
					<p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
			{action}
		</div>
	);
}

function QuickLink({
	href,
	icon,
	children,
}: {
	href: string;
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<Link
			href={href as Route}
			className="inline-flex h-9 items-center gap-2 rounded-full border border-border/80 bg-background px-3.5 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60 [&_svg]:size-4 [&_svg]:text-muted-foreground"
		>
			{icon}
			{children}
		</Link>
	);
}

function NoPlaylistsHome() {
	return (
		<section aria-labelledby="home-empty-heading" className="max-w-xl pt-6">
			<h1
				id="home-empty-heading"
				className="font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl"
			>
				Welcome
			</h1>
			<p className="mt-3 text-base leading-7 text-muted-foreground">
				Add an Xtream or M3U playlist to start watching live TV, movies and
				series. You can add more later.
			</p>
			<Button
				className="mt-6"
				nativeButton={false}
				render={<Link href="/dashboard/addplaylist" />}
			>
				<PlusIcon className="size-4" />
				Add playlist
			</Button>
		</section>
	);
}

async function HomeContent() {
	const playlists = await fetchPlaylists();

	if (playlists.length === 0) {
		return <NoPlaylistsHome />;
	}

	const cards: PlaylistCardData[] = playlists.map((p) => ({
		id: p.id,
		source: p.source,
		playlistName: p.playlistName,
		serverUrl: p.serverUrl,
		username: p.username,
		createdAt: dateFormatter.format(new Date(p.createdAt)),
	}));
	const playlistNames = Object.fromEntries(
		playlists.map((p) => [p.id, p.playlistName]),
	);
	const activeCookie = (await cookies()).get(ACTIVE_PLAYLIST_COOKIE)?.value;
	const activeId =
		playlists.find((p) => p.id === activeCookie)?.id ?? playlists[0].id;

	return (
		<div className="space-y-10 pb-6">
			<header>
				<h1 className="font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl">
					Welcome back
				</h1>
				<p className="mt-2 text-base text-muted-foreground">
					Pick up where you left off, or open one of your playlists.
				</p>
				<nav aria-label="Quick access" className="mt-5 flex flex-wrap gap-2">
					<QuickLink
						href={`/dashboard/search/${activeId}`}
						icon={<SearchIcon />}
					>
						Search
					</QuickLink>
					<QuickLink href="/dashboard/favorites" icon={<HeartIcon />}>
						Favorites
					</QuickLink>
					<QuickLink href="/dashboard/watchlater" icon={<BookmarkIcon />}>
						Watch Later
					</QuickLink>
				</nav>
			</header>

			<section aria-labelledby="continue-heading">
				<SectionHeading id="continue-heading" title="Continue watching" />
				<Suspense fallback={<ContinueWatchingSkeleton />}>
					<ContinueWatching playlistNames={playlistNames} />
				</Suspense>
			</section>

			<section aria-labelledby="playlists-heading">
				<SectionHeading
					id="playlists-heading"
					title="Your playlists"
					description={`${playlists.length} ${playlists.length === 1 ? "source" : "sources"}`}
					action={
						<Button
							variant="outline"
							size="sm"
							nativeButton={false}
							render={<Link href="/dashboard/addplaylist" />}
						>
							<PlusIcon className="size-4" />
							Add playlist
						</Button>
					}
				/>
				<ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
					{cards.map((playlist) => (
						<PlaylistCard
							key={playlist.id}
							{...playlist}
							subscriptionStatus={
								playlist.source === "XTREAM" ? (
									<Suspense
										fallback={
											<Skeleton className="inline-block h-3.5 w-28 align-middle" />
										}
									>
										<PlaylistSubscriptionStatus playlistId={playlist.id} />
									</Suspense>
								) : null
							}
						/>
					))}
				</ul>
			</section>
		</div>
	);
}

function Page() {
	return (
		<div className="-m-1 flex h-full flex-col overflow-x-hidden overflow-y-auto p-1">
			<Suspense fallback={<HomeSkeleton />}>
				<HomeContent />
			</Suspense>
		</div>
	);
}

export default Page;
