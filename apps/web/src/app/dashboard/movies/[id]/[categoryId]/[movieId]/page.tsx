import "server-only";
import type { MovieDetailPageProps as PageProps } from "@/components/types";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import { CopyStreamButton } from "@/components/copy-stream-button";
import { ItemActionButtons } from "@/components/item-action-buttons";
import { getItemStatus } from "@/server/user-items";
import type { StandardXtreamMovie } from "@iptv/xtream-api/standardized";
import { Star, Clock, Calendar, Globe, ExternalLink, Film } from "lucide-react";

export default async function MovieDetailPage({ params }: PageProps) {
	const { id, categoryId, movieId } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);

	const movie = (await xtream.getMovie({ movieId })) as StandardXtreamMovie;

	if (!movie) {
		notFound();
	}

	const streamUrl = xtream.generateStreamUrl({
		type: "movie",
		streamId: movieId,
		extension: "mp4",
	});

	const itemStatus = await getItemStatus(id, movieId, "movie");

	return (
		<div className="min-h-full overflow-y-scroll no-scrollbar">
			<div className="relative mb-4 md:mb-0">
				{(movie.cover || movie.poster) && (
					<div className="absolute inset-0 h-full overflow-hidden">
						<img
							src={movie.cover || movie.poster}
							alt=""
							className="size-full object-cover blur-2xl scale-110 opacity-20"
						/>
						<div className="absolute inset-0 bg-linear-to-b from-background/60 via-background/80 to-background" />
					</div>
				)}
				<div className="relative ">
					<div className="flex  flex-col md:flex-row gap-8">
						{movie.poster && (
							<div className="shrink-0">
								<img
									src={movie.poster}
									alt={movie.name}
									className="w-48 md:w-56 rounded-xl shadow-2xl shadow-black/30 border border-border/30"
								/>
							</div>
						)}
						<div className="flex-1 space-y-5">
							<div>
								<h1 className="text-3xl font-bold tracking-tight mb-1">
									{movie.name}
								</h1>
								{movie.originalName && movie.originalName !== movie.name && (
									<p className="text-base text-muted-foreground italic">
										{movie.originalName}
									</p>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{movie.voteAverage > 0 && (
									<span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-500 px-2.5 py-1 text-sm font-semibold">
										<Star className="size-3.5 fill-amber-500" />
										{Number(movie.voteAverage).toFixed(1)}
									</span>
								)}
								{movie.durationFormatted && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Clock className="size-3.5" />
										{movie.durationFormatted}
									</span>
								)}
								{movie.releaseDate && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Calendar className="size-3.5" />
										{new Date(movie.releaseDate).getFullYear()}
									</span>
								)}
								{movie.country && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Globe className="size-3.5" />
										{movie.country}
									</span>
								)}
								{movie.rating?.mpaa && (
									<span className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-sm font-semibold">
										{movie.rating.mpaa}
									</span>
								)}
							</div>
							{movie.genre?.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{movie.genre.map((g) => (
										<span
											key={g}
											className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
										>
											{g}
										</span>
									))}
								</div>
							)}
							{movie.plot && (
								<p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
									{movie.plot}
								</p>
							)}
							<div className="space-y-2 text-sm">
								{movie.director?.length > 0 && (
									<p>
										<span className="text-muted-foreground">Director: </span>
										<span className="font-medium">
											{movie.director.join(", ")}
										</span>
									</p>
								)}
								{movie.cast?.length > 0 && (
									<p>
										<span className="text-muted-foreground">Cast: </span>
										<span className="font-medium">{movie.cast.join(", ")}</span>
									</p>
								)}
								{movie.subtitles?.length > 0 && (
									<p>
										<span className="text-muted-foreground">Subtitles: </span>
										<span className="font-medium">
											{movie.subtitles.join(", ")}
										</span>
									</p>
								)}
							</div>
							<div className="flex flex-wrap gap-3 pt-2">
								<CopyStreamButton url={movie.url ? movie.url : streamUrl!} />
								<Tooltip>
									<TooltipTrigger
										render={
											<a
												href={movie.url}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors"
											>
												<ExternalLink className="size-4" />
											</a>
										}
									/>
									<TooltipContent>
										<p>{"Read the content in another player"}</p>
									</TooltipContent>
								</Tooltip>
								<ItemActionButtons
									playlistId={id}
									itemId={movieId}
									itemType="movie"
									itemName={movie.name}
									itemUrl={`/dashboard/movies/${id}/${categoryId}/${movieId}`}
									isWatchLater={itemStatus.isWatchLater}
									isFavorite={itemStatus.isFavorite}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			{movie.youtubeId && (
				<div className=" pb-8">
					<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
						<Film className="size-5 text-primary" />
						Trailer
					</h2>
					<div className="relative w-full max-w-3xl rounded-xl overflow-hidden border border-border/50 shadow-xl aspect-video">
						<iframe
							className="absolute inset-0 size-full"
							src={`https://www.youtube.com/embed/${movie.youtubeId}`}
							title={`${movie.name} trailer`}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
						/>
					</div>
				</div>
			)}
		</div>
	);
}
