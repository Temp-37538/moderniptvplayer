import { createPageMetadata, getMovieMetadataContext } from "@/app/metadata";
import { CopyStreamButton } from "@/components/copy-stream-button";
import { ExternalStreamLink } from "@/components/external-stream-link";
import { ItemActionButtons } from "@/components/item-action-buttons";
import type { MovieDetailPageProps as PageProps } from "@/components/types";
import { toSafeImageSrc } from "@/lib/image-url";
import { toYoutubeEmbedUrl } from "@/lib/youtube";
import { getCachedMovie } from "@/server/cached-content";
import { getItemStatus } from "@/server/user-items";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import { Film } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

function safeHref(url: string): string | undefined {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:"
			? url
			: undefined;
	} catch {
		return undefined;
	}
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { id, categoryId, movieId } = await params;
	const context = await getMovieMetadataContext(id, movieId);
	const movieTitle = context?.movie?.name ?? "Movie Details";
	const description = context?.movie?.plot?.trim();

	return createPageMetadata({
		title: movieTitle,
		description:
			description && description.length > 0
				? description
				: context?.playlist
					? `View details, trailers, and actions for ${movieTitle} from ${context.playlist.playlistName}.`
					: "View details for this movie.",
		path: `/dashboard/movies/${id}/${categoryId}/${movieId}`,
		noIndex: true,
	});
}

export default function MovieDetailPage({ params }: PageProps) {
	return <MovieDetailContent params={params} />;
}

async function MovieDetailContent({ params }: PageProps) {
	const { id, categoryId, movieId } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const movie = await getCachedMovie(id, playlist, movieId);

	if (!movie) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);

	const streamUrl = xtream.generateStreamUrl({
		type: "movie",
		streamId: movieId,
		extension: "mp4",
	});

	const itemStatus = await getItemStatus(id, movieId, "movie");
	const safePosterSrc = toSafeImageSrc(movie.poster);
	// The provider's value is untrusted: only a valid YouTube id gets an embed.
	const trailerUrl = toYoutubeEmbedUrl(movie.youtubeId);
	return (
		<div className="min-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-border/50 scrollbar-track-border/20">
			<div className="w-full px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-12">
				<div className="grid gap-10 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-14">
					<div className="md:sticky md:top-8 md:self-start space-y-5">
						{safePosterSrc ? (
							<Image
								src={safePosterSrc}
								alt={movie.name}
								width={304}
								height={456}
								unoptimized
								className="w-full rounded-2xl border border-border/40 object-cover shadow-2xl shadow-black/50"
							/>
						) : (
							<div className="flex aspect-2/3 w-full items-center justify-center rounded-2xl border border-border/40 bg-muted">
								<Film className="size-12 text-muted-foreground/40" />
							</div>
						)}
						<dl className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium tabular-nums text-muted-foreground">
							{movie.durationFormatted ? (
								<div className="flex items-center gap-1.5">
									<span>{movie.durationFormatted}</span>
								</div>
							) : null}
							{movie.releaseDate ? (
								<div className="flex items-center gap-1.5">
									<span>{new Date(movie.releaseDate).getFullYear()}</span>
								</div>
							) : null}
						</dl>
						{streamUrl ? (
							<div className="mt-5 flex items-center justify-center gap-2 border-t border-border/50 pt-5">
								<CopyStreamButton url={movie.url ? movie.url : streamUrl} />
								{safeHref(movie.url ?? "") ? (
									<ExternalStreamLink
										href={safeHref(movie.url ?? "") ?? ""}
										label="Read the content in another player"
									/>
								) : null}
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
						) : null}
					</div>

					<div className="min-w-0">
						<header>
							<h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl">
								{movie.name}
							</h1>
							{movie.originalName && movie.originalName !== movie.name ? (
								<p className="mt-2 text-sm text-muted-foreground italic">
									{movie.originalName}
								</p>
							) : null}
							{movie.genre && movie.genre.length > 0 ? (
								<p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{movie.genre.join(" - ")}
								</p>
							) : null}
						</header>

						{movie.plot ? (
							<p className="mt-6 max-w-prose text-[0.975rem] leading-relaxed text-foreground/80">
								{movie.plot}
							</p>
						) : null}

						<dl className="mt-8 grid gap-x-8 gap-y-4 border-y border-border/50 py-6 sm:grid-cols-2">
							{movie.director && movie.director.length > 0 ? (
								<div>
									<dt className="text-sm font-medium text-foreground/80">
										Director
									</dt>
									<dd className="mt-1.5 text-sm">
										{movie.director.join(", ")}
									</dd>
								</div>
							) : null}
							{movie.cast && movie.cast.length > 0 ? (
								<div>
									<dt className="text-sm font-medium text-foreground/80">
										Cast
									</dt>
									<dd className="mt-1.5 text-sm">{movie.cast.join(", ")}</dd>
								</div>
							) : null}
							{movie.subtitles && movie.subtitles.length > 0 ? (
								<div>
									<dt className="text-sm font-medium text-foreground/80">
										Subtitles
									</dt>
									<dd className="mt-1.5 text-sm">
										{movie.subtitles.join(", ")}
									</dd>
								</div>
							) : null}
							{movie.country ? (
								<div>
									<dt className="text-sm font-medium text-foreground/80">
										Country
									</dt>
									<dd className="mt-1.5 text-sm">{movie.country}</dd>
								</div>
							) : null}
						</dl>

						{trailerUrl ? (
							<div className="mt-10 space-y-3">
								<h2 className="font-serif text-2xl tracking-tight">
									Trailer
								</h2>
								<div className="overflow-hidden rounded-2xl border border-border/40 shadow-2xl shadow-black/50">
									<div className="relative aspect-video">
										<iframe
											className="absolute inset-0 size-full"
											src={trailerUrl}
											title={`${movie.name} trailer`}
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
										/>
									</div>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
