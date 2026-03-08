import { createPageMetadata, getShowMetadataContext } from "@/app/metadata";
import { CopyStreamButton } from "@/components/copy-stream-button";
import { ItemActionButtons } from "@/components/item-action-buttons";
import type { PageProps } from "@/components/types";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getItemStatus } from "@/server/user-items";
import { getPlaylistById, getShowSafe } from "@/server/xtream";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { Calendar, Clock, ExternalLink, Film, Star, Tv } from "lucide-react";
import { notFound } from "next/navigation"; 
import { toSafeImageSrc } from "@/lib/image-url";

export async function generateMetadata({ params }: PageProps) {
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

export default async function ShowDetailPage({ params }: PageProps) {
	const { id, categoryId, showId } = await params;

	if (!id || !showId) {
		notFound();
	}

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	let show: StandardXtreamShow | null = null;

	try {
		show = (await getShowSafe(playlist, showId)) as StandardXtreamShow;
	} catch (error) {
		console.error("Error fetching show details:", error);
		show = null;
	}

	if (!show) {
		notFound();
	}

	const itemStatus = await getItemStatus(id, showId, "series");
	const safePosterSrc = toSafeImageSrc(show.poster);
	const safeCoverSrc = toSafeImageSrc(show.cover) ?? safePosterSrc;

	return (
		<div className="min-h-full no-scrollbar overflow-y-scroll">
			<div className="relative">
				{safeCoverSrc && (
					<div className="absolute inset-0 h-100 overflow-hidden">
						<img
							src={safeCoverSrc}
							alt=""
							className="size-full object-cover blur-2xl scale-110 opacity-20"
						/>
						<div className="absolute inset-0 bg-linear-to-b from-background/60 via-background/80 to-background" />
					</div>
				)}
				<div className="relative">
					<div className="flex flex-col md:flex-row gap-8">
						{safePosterSrc && (
							<div className="shrink-0">
								<img
									src={safePosterSrc}
									alt={show.name}
									className="w-48 md:w-56 rounded-xl shadow-2xl shadow-black/30 border border-border/30"
								/>
							</div>
						)}
						<div className="flex-1 space-y-5">
							<h1 className="text-3xl font-bold tracking-tight">{show.name}</h1>
							<div className="flex flex-wrap items-center gap-2">
								{show.voteAverage > 0 && (
									<span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-500 px-2.5 py-1 text-sm font-semibold">
										<Star className="size-3.5 fill-amber-500" />
										{Number(show.voteAverage).toFixed(1)}
									</span>
								)}
								{show.releaseDate && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Calendar className="size-3.5" />
										{new Date(show.releaseDate).getFullYear()}
									</span>
								)}
								{show.seasons?.length > 0 && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Tv className="size-3.5" />
										{show.seasons.length} season
										{show.seasons.length > 1 ? "s" : ""}
									</span>
								)}
							</div>
							{show.genre?.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{show.genre.map((g) => (
										<span
											key={g}
											className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
										>
											{g}
										</span>
									))}
								</div>
							)}
							{show.plot && (
								<p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
									{show.plot}
								</p>
							)}
							<div className="space-y-2 text-sm">
								{show.director?.length > 0 &&
									show.director.some((d) => d !== "") && (
										<p>
											<span className="text-muted-foreground">Director: </span>
											<span className="font-medium">
												{show.director.filter((d) => d !== "").join(", ")}
											</span>
										</p>
									)}
								{show.cast?.length > 0 && (
									<p>
										<span className="text-muted-foreground">Cast: </span>
										<span className="font-medium">{show.cast.join(", ")}</span>
									</p>
								)}
							</div>
							<div className="flex flex-wrap gap-3 pt-2">
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
						</div>
					</div>
				</div>
			</div>
			{show.youtubeId && (
				<div className="px-6 py-4 md:px-8 pb-6">
					<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
						<Film className="size-5 text-primary z-10" />
						<p className="z-10">Trailer</p>
					</h2>
					<div className="relative w-full max-w-3xl rounded-xl overflow-hidden border border-border/50 shadow-xl aspect-video">
						<iframe
							className="absolute inset-0 size-full"
							src={`https://www.youtube.com/embed/${show.youtubeId}`}
							title={`${show.name} trailer`}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
						/>
					</div>
				</div>
			)}
			<div className="px-6 md:px-8 pb-8 space-y-8">
				<h2 className="text-lg font-semibold flex items-center gap-2">
					<Tv className="size-5 text-primary" />
					Seasons
				</h2>
				{show.seasons?.length === 0 && (
					<p className="text-muted-foreground">No seasons available.</p>
				)}
				{show.seasons?.map((season) => (
					<section
						key={season.id}
						className="rounded-xl border border-border/50 bg-card overflow-hidden"
					>
						<div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
							<div>
								<h3 className="font-semibold">{season.name}</h3>
								<p className="text-sm text-muted-foreground">
									{season.episodeCount} episode
									{season.episodeCount !== 1 ? "s" : ""}
									{season.voteAverage > 0 &&
										` · ★ ${Number(season.voteAverage).toFixed(1)}`}
								</p>
							</div>
						</div>
						{season.episodes === undefined ? (
							<p className="px-5 py-4 text-sm text-muted-foreground">
								Episodes data not loaded.
							</p>
						) : season.episodes.length > 0 ? (
							<div className="divide-y divide-border/30">
								{season.episodes.map((episode) => {
									return (
										<div
											key={episode.id}
											className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
										>
											<div className="flex items-center justify-center size-8 rounded-lg bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
												{episode.number}
											</div>
											<div className="flex-1 min-w-0 space-y-1">
												<h4 className="text-sm font-medium leading-tight">
													{episode.title}
												</h4>
												{episode.plot && (
													<p className="text-xs text-muted-foreground line-clamp-2">
														{episode.plot}
													</p>
												)}
												{episode.durationFormatted && (
													<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
														<Clock className="size-3" />
														{episode.durationFormatted}
													</span>
												)}
											</div>
											{episode.url && (
												<div className="flex items-center gap-2 shrink-0">
													<CopyStreamButton url={episode.url} />
													<Tooltip>
														<TooltipTrigger
															render={
																<a
																	target="_blank"
																	aria-label="Watch episode in external window"
																	rel="noopener noreferrer"
																	href={episode.url}
																	type="button"
																	className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors"
																>
																	<ExternalLink className="size-4" />
																</a>
															}
														/>
														<TooltipContent>
															Watch in external window
														</TooltipContent>
													</Tooltip>
												</div>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<p className="px-5 py-4 text-sm text-muted-foreground">
								No episodes available for this season.
							</p>
						)}
					</section>
				))}
			</div>
		</div>
	);
}
