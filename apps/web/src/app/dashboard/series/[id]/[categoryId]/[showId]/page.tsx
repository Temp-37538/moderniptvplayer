import { createPageMetadata, getShowMetadataContext } from "@/app/metadata";
import { ItemActionButtons } from "@/components/item-action-buttons";
import { SeasonsList } from "@/components/seasons-list";
import type { PageProps } from "@/components/types";
import { toSafeImageSrc } from "@/lib/image-url";
import { formatTimestamp, pickResumeEpisode } from "@/lib/series-resume";
import { toYoutubeEmbedUrl } from "@/lib/youtube";
import { getCachedShow } from "@/server/cached-content";
import { getItemStatus } from "@/server/user-items";
import { getEpisodeProgress } from "@/server/watch-progress";
import { getPlaylistById } from "@/server/xtream";
import { PlayIcon, Tv } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { id, categoryId, showId } = await params;
	const context = await getShowMetadataContext(id, showId);
	const showTitle = context?.show?.name ?? "Series Details";
	const description = context?.show?.plot?.trim();

	return createPageMetadata({
		title: showTitle,
		description:
			description && description.length > 0
				? description
				: context?.playlist
					? `View seasons, episodes, and actions for ${showTitle} from ${context.playlist.playlistName}.`
					: "View details for this series.",
		path: `/dashboard/series/${id}/${categoryId}/${showId}`,
		noIndex: true,
	});
}

export default function ShowDetailPage({ params }: PageProps) {
	return <ShowDetailContent params={params} />;
}

async function ShowDetailContent({ params }: PageProps) {
	const { id, categoryId, showId } = await params;

	if (!id || !showId) {
		notFound();
	}

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const show = await getCachedShow(id, playlist, showId);

	if (!show) {
		notFound();
	}

	const itemStatus = await getItemStatus(id, showId, "series");
	const safePosterSrc = toSafeImageSrc(show.poster);
	const episodeProgress = await getEpisodeProgress(id, showId);

	// Resume target for the "continue watching" button under the poster.
	const episodesById = new Map<string, { episode: any; seasonName: string }>();
	const playableIds: string[] = [];
	for (const season of show.seasons ?? []) {
		for (const episode of season.episodes ?? []) {
			if (episode.url) {
				episodesById.set(episode.id, { episode, seasonName: season.name });
				playableIds.push(episode.id);
			}
		}
	}
	const resumeTarget = pickResumeEpisode(playableIds, episodeProgress);
	const resumeEntry = resumeTarget
		? episodesById.get(resumeTarget.episodeId)
		: undefined;
	const resumeLabel = resumeEntry
		? `${resumeEntry.seasonName} - E${String(resumeEntry.episode.number).padStart(2, "0")}`
		: null;
	const resumeText =
		!resumeTarget || !resumeEntry
			? ""
			: resumeTarget.kind === "resume"
				? `Resume at ${formatTimestamp(episodeProgress[resumeEntry.episode.id]?.positionSec ?? 0)}`
				: resumeTarget.kind === "next"
					? "Next episode"
					: resumeTarget.kind === "rewatch"
						? "Watch again"
						: "Play";
	// The provider's value is untrusted: only a valid YouTube id gets an embed.
	const trailerUrl = toYoutubeEmbedUrl(show.youtubeId);

	return (
		<div className="min-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-border/50 scrollbar-track-border/20">
			<div className="w-full px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-12">
				<div className="grid gap-10 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-14">
					<div className="md:sticky md:top-8 md:self-start space-y-5">
						<div className="relative">
							{safePosterSrc ? (
								<Image
									src={safePosterSrc}
									alt={show.name}
									width={304}
									height={456}
									unoptimized
									priority
									className="w-full rounded-2xl border border-border/40 object-cover shadow-2xl shadow-black/50"
								/>
							) : (
								<div className="flex aspect-2/3 w-full items-center justify-center rounded-2xl border border-border/40 bg-muted">
									<Tv className="size-12 text-muted-foreground/40" />
								</div>
							)}
							<div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
						</div>

						<dl className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium tracking-wide tabular-nums">
							{show.releaseDate && (
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<dt className="sr-only">Year</dt>

									<dd>{new Date(show.releaseDate).getFullYear()}</dd>
								</div>
							)}
							{show.seasons && show.seasons.length > 0 && (
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<dt className="sr-only">Seasons</dt>

									<dd>
										{show.seasons.length} season
										{show.seasons.length > 1 ? "s" : ""}
									</dd>
								</div>
							)}
						</dl>

						<div className="mt-5 flex items-center justify-center gap-2 border-t border-border/50 pt-5">
							<ItemActionButtons
								playlistId={id}
								itemId={showId}
								itemType="series"
								itemName={show.name}
								itemUrl={`/dashboard/series/${id}/${categoryId}/${showId}`}
								isWatchLater={itemStatus.isWatchLater}
								isFavorite={itemStatus.isFavorite}
							/>
						</div>
						{resumeEntry && (
							<a
								href={`#episode-${resumeEntry.episode.id}`}
								className="mt-5 block w-full overflow-hidden rounded-md border border-border/40 transition-colors hover:bg-muted/40"
							>
								<span className="flex items-center gap-3 px-3 py-2.5">
									<PlayIcon className="size-4 shrink-0 text-primary" />
									<span className="min-w-0 flex-1">
										<span className="block text-xs text-muted-foreground">
											{resumeText}
										</span>
										<span className="block truncate text-sm font-medium">
											{resumeLabel}
										</span>
									</span>
								</span>
								{resumeTarget?.kind === "resume" && (
									<span className="block h-px w-full bg-border/60">
										<span
											className="block h-full bg-primary"
											style={{
												width: `${Math.min(
													100,
													((episodeProgress[resumeEntry.episode.id]
														?.positionSec ?? 0) /
														(episodeProgress[resumeEntry.episode.id]
															?.durationSec || 1)) *
														100,
												)}%`,
											}}
										/>
									</span>
								)}
							</a>
						)}
					</div>

					<div className="min-w-0">
						<header>
							<h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl">
								{show.name}
							</h1>
							{show.genre && show.genre.length > 0 && (
								<p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{show.genre.join(", ")}
								</p>
							)}
						</header>

						{show.plot && (
							<p className="mt-6 max-w-prose text-[0.975rem] leading-relaxed text-foreground/80">
								{show.plot}
							</p>
						)}

						<dl className="mt-8 grid gap-x-8 gap-y-4 border-y border-border/50 py-6 sm:grid-cols-2">
							{show.director?.some((name) => name !== "") && (
								<div>
									<dt className="text-sm font-medium text-foreground/80">
										Director
									</dt>
									<dd className="mt-1.5 text-sm">
										{show.director.filter((name) => name !== "").join(", ")}
									</dd>
								</div>
							)}
							{show.cast && show.cast.length > 0 && (
								<div>
									<dt className="text-sm font-medium text-foreground/80">
										Cast
									</dt>
									<dd className="mt-1.5 text-sm">{show.cast.join(", ")}</dd>
								</div>
							)}
						</dl>

						{show.seasons && show.seasons.length === 0 && (
							<p className="mt-10 text-sm text-muted-foreground">
								No seasons available.
							</p>
						)}

						{show.seasons && show.seasons.length > 0 && (
							<SeasonsList
								seasons={show.seasons}
								playlistId={id}
								categoryId={categoryId}
								showId={showId}
								showName={show.name}
								showPoster={show.poster}
								posterSrc={safePosterSrc}
								progress={episodeProgress}
							/>
						)}

						{trailerUrl && (
							<section className="mt-14">
								<h2 className="flex items-center gap-2 font-serif text-2xl tracking-tight">
									Trailer
								</h2>
								<div className="mt-4 aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border/40 shadow-xl shadow-black/40">
									<iframe
										className="size-full"
										src={trailerUrl}
										title={`${show.name} trailer`}
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowFullScreen
									/>
								</div>
							</section>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
