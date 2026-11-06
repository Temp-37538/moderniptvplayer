"use client";

import { CopyStreamButton } from "@/components/copy-stream-button";
import { DesktopPlayer } from "@/components/desktop-player";
import { ExternalStreamLink } from "@/components/external-stream-link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { VideoPlayer } from "@/components/video-player";
import { useDesktopBridge } from "@/lib/desktop/bridge";
import { withStreamCategory } from "@/lib/stream-category";
import { PLAY_EPISODE_EVENT } from "@/lib/play-episode";
import type { ProgressDetails } from "@/lib/player/types";
import { seasonWatchActions } from "@/lib/season-watch";
import type { EpisodeProgressEntry } from "@/lib/series-resume";
import { setEpisodeWatched, setSeasonWatched } from "@/server/episode-watch";
import { CheckIcon, ChevronDown, Clock, PlayIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Episode = {
	durationFormatted?: string;
	id: string;
	number: number;
	plot?: string | null;
	title: string;
	url?: string;
};

type Season = {
	episodes?: Episode[];
	episodeCount: number;
	id: string;
	name: string;
	voteAverage: number;
};

type SeasonsListProps = {
	seasons: Season[];
	playlistId: string;
	categoryId: string;
	showId: string;
	showName: string;
	/** The provider's poster URL: stored with the progress. */
	showPoster?: string | null;
	/** Poster shown in the player before playback (already proxied). */
	posterSrc?: string;
	/** Where the user stopped, by episode id. */
	progress: Record<string, EpisodeProgressEntry>;
};

type PlayableEpisode = {
	id: string;
	/** "Show - Season 2 - E04" */
	name: string;
	/** "Season 2 - E04" */
	label: string;
	extension: string;
	/** The provider's own URL (http or https only). */
	directUrl?: string;
};

const MOBILE_BREAKPOINT = "(min-width: 640px)";

function playableEpisodes(season: Season): Episode[] {
	return (season.episodes ?? []).filter((episode) => episode.id && episode.url);
}

function withWatchedState(
	current: Record<string, EpisodeProgressEntry>,
	episodeIds: string[],
	watched: boolean,
): Record<string, EpisodeProgressEntry> {
	const next = { ...current };
	const now = Date.now();
	const count = episodeIds.length;
	episodeIds.forEach((id, index) => {
		const previous = current[id];
		const durationSec = previous?.durationSec ?? 0;
		const age = watched ? count - 1 - index : index;
		next[id] = {
			positionSec: watched && durationSec > 0 ? durationSec : 0,
			durationSec,
			completed: watched,
			updatedAt: now - age,
		};
	});
	return next;
}

function EpisodeWatchButton({
	completed,
	disabled,
	onToggle,
}: {
	completed: boolean;
	disabled: boolean;
	onToggle: () => void;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-pressed={completed}
			aria-label={
				completed ? "Mark episode as unwatched" : "Mark episode as watched"
			}
			title={completed ? "Mark as unwatched" : "Mark as watched"}
			disabled={disabled}
			onClick={onToggle}
		>
			<CheckIcon
				className={
					completed ? "size-4 text-primary" : "size-4 text-muted-foreground/40"
				}
			/>
		</Button>
	);
}

// This whole block is a client component on purpose. The season toggle needs state,
// and passing render props down from the server page is impossible because RSC
// cannot serialise functions. So the data comes in as plain props instead.
//
// On mobile a long series stacks every episode of every season in one column, so
// seasons start collapsed with only the first one open. From sm up the two-column
// grid is compact enough that hiding episodes behind a click only gets in the way,
// so everything starts open and the headers stop being interactive.
export function SeasonsList({
	seasons,
	playlistId,
	categoryId,
	showId,
	showName,
	showPoster,
	posterSrc,
	progress: serverProgress,
}: SeasonsListProps) {
	const router = useRouter();
	const bridge = useDesktopBridge();
	const [isPending, startTransition] = useTransition();
	const [progress, setProgress] = useState(serverProgress);
	const [progressSource, setProgressSource] = useState(serverProgress);
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [openSeasons, setOpenSeasons] = useState<Set<string>>(
		() => new Set(seasons.map((season) => season.id)),
	);
	const [isDesktop, setIsDesktop] = useState(true);
	const [autoNext, setAutoNext] = useState(() => {
		if (typeof window === "undefined") {
			return true;
		}
		return localStorage.getItem("iptv:auto-next") !== "false";
	});
	useEffect(() => {
		localStorage.setItem("iptv:auto-next", String(autoNext));
	}, [autoNext]);

	useEffect(() => {
		const query = window.matchMedia(MOBILE_BREAKPOINT);

		const sync = () => {
			setIsDesktop(query.matches);
			setOpenSeasons(
				query.matches
					? new Set(seasons.map((season) => season.id))
					: new Set(seasons[0] ? [seasons[0].id] : []),
			);
		};

		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, [seasons]);

	// "Continue watching" links here with #episode-<id>.
	useEffect(() => {
		const openFromHash = () => {
			const id = /^#episode-(.+)$/.exec(window.location.hash)?.[1];
			if (id) {
				setPlayingId(decodeURIComponent(id));
			}
		};
		openFromHash();
		window.addEventListener("hashchange", openFromHash);
		return () => window.removeEventListener("hashchange", openFromHash);
	}, []);

	// The resume button, which is outside this list, asks for an episode to play.
	useEffect(() => {
		const onPlayEpisode = (event: Event) => {
			const id = (event as CustomEvent<string>).detail;
			if (typeof id === "string") {
				setPlayingId(id);
			}
		};
		window.addEventListener(PLAY_EPISODE_EVENT, onPlayEpisode);
		return () => window.removeEventListener(PLAY_EPISODE_EVENT, onPlayEpisode);
	}, []);

	if (progressSource !== serverProgress) {
		setProgressSource(serverProgress);
		setProgress(serverProgress);
	}

	function updateWatched(
		episodeIds: string[],
		watched: boolean,
		action: () => Promise<void>,
	) {
		const previous = progress;
		setProgress((current) => withWatchedState(current, episodeIds, watched));
		startTransition(async () => {
			try {
				await action();
				router.refresh();
			} catch {
				setProgress(previous);
				toast.error("Could not update watched episodes");
			}
		});
	}

	// Watching order: season after season, only what has a stream.
	const playable: PlayableEpisode[] = seasons.flatMap((season) =>
		(season.episodes ?? [])
			.filter((episode) => episode.url)
			.map((episode) => {
				const label = `${season.name} - E${String(episode.number).padStart(2, "0")}`;
				return {
					id: episode.id,
					name: `${showName} - ${label}`,
					label,
					directUrl: /^https?:\/\//i.test(episode.url ?? "")
						? episode.url
						: undefined,
					extension: (
						episode.url?.match(/\.([a-z0-9]{2,5})(?:\?.*)?$/i)?.[1] ?? "mp4"
					).toLowerCase(),
				};
			}),
	);
	const playingIndex = playable.findIndex(
		(episode) => episode.id === playingId,
	);
	const playing = playingIndex === -1 ? null : (playable[playingIndex] ?? null);
	const nextEpisode = playing ? playable[playingIndex + 1] : undefined;

	// In the desktop app an episode plays in mpv, in the player's own modal,
	// without the Sheet: a second dialog would keep the focus and the clicks
	// away from it.
	const desktopUrl = bridge ? playing?.directUrl : undefined;
	const progressDetails: ProgressDetails | undefined = playing
		? {
				playlistId,
				itemId: playing.id,
				itemType: "episode",
				itemName: playing.name,
				itemUrl: `/dashboard/series/${playlistId}/${categoryId}/${showId}#episode-${playing.id}`,
				itemImage: showPoster ?? null,
				showId,
			}
		: undefined;
	const playNext = () => {
		if (autoNext && nextEpisode) {
			setPlayingId(nextEpisode.id);
		}
	};

	// (resume CTA moved to the series page, under the poster)

	function startAt(episodeId: string) {
		const entry = progress[episodeId];
		return entry && !entry.completed ? entry.positionSec : 0;
	}

	function closePlayer() {
		setPlayingId(null);
		// "Continue watching" links here with #episode-<id>. Leaving the hash in
		// the address would make the same link do nothing the next time.
		if (window.location.hash.startsWith("#episode-")) {
			window.history.replaceState(
				null,
				"",
				window.location.pathname + window.location.search,
			);
		}
		// The player saved where you stopped as it closed: reload the page data
		// so the resume button and the episode marks are up to date.
		setTimeout(() => router.refresh(), 1000);
	}

	function toggle(id: string) {
		if (isDesktop) {
			return;
		}

		setOpenSeasons((previous) => {
			const next = new Set(previous);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	return (
		<div className="mt-12 space-y-6 sm:space-y-12">
			<Sheet
				open={playing !== null && !desktopUrl}
				onOpenChange={(open) => {
					if (!open) {
						closePlayer();
					}
				}}
			>
				<SheetContent
					side="bottom"
					className="mx-auto w-full max-w-4xl rounded-t-2xl border-t-0 !border-t-0 pb-6"
					showCloseButton={false}
				>
					<SheetHeader className="pb-2">
						<div className="flex items-center justify-between gap-3">
							<SheetTitle className="min-w-0 truncate leading-none">
								{playing?.name}
							</SheetTitle>
							<div className="flex shrink-0 items-center gap-3">
								<label
									htmlFor="episode-auto-next"
									className="flex cursor-pointer items-center gap-2 leading-none text-xs text-muted-foreground"
								>
									<span>Auto next</span>
									<Switch
										id="episode-auto-next"
										size="sm"
										checked={autoNext}
										onCheckedChange={setAutoNext}
									/>
								</label>
								<SheetClose render={<Button variant="ghost" size="icon-sm" />}>
									<XIcon />
									<span className="sr-only">Close</span>
								</SheetClose>
							</div>
						</div>
					</SheetHeader>
					{playing && (
						<div className="space-y-3 px-4">
							<VideoPlayer
								key={playing.id}
								autoPlay
								poster={posterSrc}
								startAt={startAt(playing.id)}
								progress={progressDetails}
								sources={[
									{
										kind: playing.extension === "m3u8" ? "hls" : "native",
										src: withStreamCategory(
											`/api/stream/vod/${encodeURIComponent(playlistId)}/episode/${encodeURIComponent(playing.id)}?ext=${encodeURIComponent(playing.extension)}`,
											categoryId,
											{ showId },
										),
									},
									// Fallback for providers that refuse the server's IP.
									...(playing.directUrl
										? [{ kind: "direct" as const, src: playing.directUrl }]
										: []),
								]}
								onEnded={playNext}
							/>
							{nextEpisode && (
								<p className="text-xs text-muted-foreground">
									Up next: {nextEpisode.label} (starts when this one ends)
								</p>
							)}
						</div>
					)}
				</SheetContent>
			</Sheet>
			{bridge && playing && desktopUrl ? (
				<DesktopPlayer
					key={playing.id}
					bridge={bridge}
					url={desktopUrl}
					title={playing.name}
					startAt={startAt(playing.id)}
					progress={progressDetails}
					autoPlay
					card={false}
					onClose={closePlayer}
					onEnded={playNext}
					topBarExtra={
						<>
							{nextEpisode && (
								<span className="hidden text-xs text-white/60 sm:inline">
									Up next: {nextEpisode.label}
								</span>
							)}
							<label className="flex cursor-pointer items-center gap-2 text-xs text-white/80">
								<input
									type="checkbox"
									checked={autoNext}
									onChange={(event) => setAutoNext(event.target.checked)}
									className="accent-white"
								/>
								Auto next
							</label>
						</>
					}
				/>
			) : null}
			{seasons.map((season) => {
				const isOpen = openSeasons.has(season.id);
				const seasonEpisodes = playableEpisodes(season);
				const seasonActions = seasonWatchActions(seasonEpisodes, progress);

				return (
					<section key={season.id}>
						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
							<button
								type="button"
								aria-expanded={isOpen}
								disabled={isDesktop}
								onClick={() => toggle(season.id)}
								className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-baseline justify-between gap-3 text-left disabled:cursor-default"
							>
								<h2 className="font-serif text-2xl tracking-tight">
									{season.name}
								</h2>
								<span className="flex items-center gap-3">
									<span className="text-xs font-medium tracking-wide text-muted-foreground tabular-nums">
										{season.episodeCount} episode
										{season.episodeCount !== 1 ? "s" : ""}
									</span>
									<span
										className={`text-muted-foreground transition-transform duration-200 ease-out sm:hidden ${
											isOpen ? "rotate-180" : ""
										}`}
									>
										<ChevronDown className="size-4" />
									</span>
								</span>
							</button>
							{seasonActions.length > 0 ? (
								<div className="flex shrink-0 flex-wrap items-center gap-1">
									{seasonActions.map((action) => (
										<Button
											key={action.label}
											type="button"
											variant="ghost"
											size="xs"
											className="text-muted-foreground"
											disabled={isPending}
											aria-label={`${action.label} for ${season.name}`}
											onClick={() =>
												updateWatched(
													seasonEpisodes.map((episode) => episode.id),
													action.watched,
													() =>
														setSeasonWatched({
															playlistId,
															showId,
															categoryId,
															seasonId: season.id,
															watched: action.watched,
														}),
												)
											}
										>
											{action.label}
										</Button>
									))}
								</div>
							) : null}
						</div>

						<div
							className={`grid transition-[grid-template-rows] duration-200 ease-out sm:grid-rows-[1fr] ${
								isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
							}`}
						>
							<div className="overflow-hidden">
								{season.episodes === undefined ? (
									<p className="py-6 text-sm text-muted-foreground">
										Episodes data not loaded.
									</p>
								) : season.episodes.length === 0 ? (
									<p className="py-6 text-sm text-muted-foreground">
										No episodes available for this season.
									</p>
								) : (
									<ul className="grid grid-cols-1 border-t border-border/40 sm:grid-cols-2">
										{season.episodes.map((episode) => (
											<li
												key={episode.id}
												id={`episode-${episode.id}`}
												className="group flex items-start gap-3.5 border-b border-border/40 p-4 transition-colors duration-200 ease-out sm:border-r sm:even:border-r-0 hover:bg-muted/40"
											>
												<span className="mt-0.5 text-xs font-medium tracking-wider text-muted-foreground/70 tabular-nums">
													{String(episode.number).padStart(2, "0")}
												</span>

												<div className="min-w-0 flex-1">
													<h3 className="text-sm leading-snug font-medium">
														{episode.title}
													</h3>
													{episode.plot && (
														<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
															{episode.plot}
														</p>
													)}
													{episode.durationFormatted && (
														<p className="mt-1.5 inline-flex items-center gap-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground/80 tabular-nums">
															<Clock className="size-3" />
															{episode.durationFormatted}
														</p>
													)}
													{(() => {
														const entry = progress[episode.id];
														if (
															!entry ||
															entry.completed ||
															entry.durationSec <= 0
														) {
															return null;
														}
														const percent = Math.min(
															100,
															(entry.positionSec / entry.durationSec) * 100,
														);
														return (
															<div
																role="progressbar"
																aria-label="Watched"
																aria-valuenow={Math.round(percent)}
																className="mt-2 h-0.5 w-full max-w-40 overflow-hidden rounded-full bg-border"
															>
																<div
																	className="h-full bg-primary"
																	style={{ width: `${percent}%` }}
																/>
															</div>
														);
													})()}
												</div>

												{episode.url && (
													<div className="flex shrink-0 items-center gap-0.5">
														<EpisodeWatchButton
															completed={
																progress[episode.id]?.completed ?? false
															}
															disabled={isPending}
															onToggle={() => {
																const watched =
																	!progress[episode.id]?.completed;
																updateWatched([episode.id], watched, () =>
																	setEpisodeWatched({
																		playlistId,
																		showId,
																		categoryId,
																		episodeId: episode.id,
																		watched,
																	}),
																);
															}}
														/>
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label={
																progress[episode.id]?.completed
																	? "Watch episode again"
																	: "Play episode"
															}
															title={
																progress[episode.id]?.completed
																	? "Watch again"
																	: startAt(episode.id) > 0
																		? "Resume"
																		: "Play"
															}
															onClick={() => setPlayingId(episode.id)}
														>
															<PlayIcon className="size-4" />
														</Button>
														<div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-within:opacity-100">
															<CopyStreamButton url={episode.url} />
															<ExternalStreamLink
																href={episode.url}
																label="Watch episode in external window"
															/>
														</div>
													</div>
												)}
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</section>
				);
			})}
		</div>
	);
}
