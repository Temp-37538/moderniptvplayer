import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import type { IdCategoryPageProps as PageProps } from "@/components/types";
import { getCachedMovies } from "@/server/cached-content";
import { getPlaylistById } from "@/server/xtream";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PaginationNav } from "@/components/pagination-nav";
import { toSafeImageSrc } from "@/lib/image-url";
import { Film } from "lucide-react";
import Image from "next/image";

export const instant = false;

const ITEMS_PER_PAGE = 20;

export async function generateMetadata({
	params,
	searchParams,
}: PageProps): Promise<Metadata> {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = Number(pageParam) || 1;
	const context = await getCategoryMetadataContext("movies", id, categoryId);
	const categoryTitle = context?.categoryName ?? "Movies";
	const pageSuffix = currentPage > 1 ? `, page ${currentPage}` : "";

	return createPageMetadata({
		title: categoryTitle,
		description: context?.playlist
			? `Browse ${categoryTitle.toLowerCase()} from ${context.playlist.playlistName}${pageSuffix}.`
			: `Browse movies in this category${pageSuffix}.`,
		path:
			currentPage > 1
				? `/dashboard/movies/${id}/${categoryId}?page=${currentPage}`
				: `/dashboard/movies/${id}/${categoryId}`,
		noIndex: true,
	});
}

export default function MoviesByCategoryPage({
	params,
	searchParams,
}: PageProps) {
	return (
		<MoviesByCategoryContent params={params} searchParams={searchParams} />
	);
}

async function MoviesByCategoryContent({ params, searchParams }: PageProps) {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = Number(pageParam) || 1;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const movies = await getCachedMovies(
		id,
		playlist,
		categoryId,
		currentPage,
		ITEMS_PER_PAGE,
	);

	const hasNextPage = movies.length === ITEMS_PER_PAGE;
	const hasPreviousPage = currentPage > 1;

	return (
		<div className="h-full overflow-y-auto  scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-border/50 scrollbar-track-border/20">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Movies</h1>
						<p className="text-sm text-muted-foreground">Page {currentPage}</p>
					</div>
				</div>
			</div>
			{movies.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6  gap-4">
					{movies.map((movie) => {
						const safePosterSrc = toSafeImageSrc(movie.poster);
						return (
							<Link
								key={movie.id}
								href={`/dashboard/movies/${id}/${categoryId}/${movie.id}`}
								className="group"
							>
								<div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
									{safePosterSrc ? (
										<Image
											src={safePosterSrc}
											alt={movie.name}
											fill
											sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 768px) 24vw, (min-width: 640px) 32vw, 48vw"
											unoptimized
											className="object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									) : (
										<div className="flex items-center justify-center size-full text-muted-foreground">
											<Film className="size-10 opacity-50" />
										</div>
									)}
								</div>
								<h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
									{movie.name}
								</h3>
							</Link>
						);
					})}
				</div>
			) : (
				<EmptyState
					title="No movies in this category"
					description="Try another category."
				/>
			)}
			<PaginationNav
				currentPage={currentPage}
				hasNextPage={hasNextPage}
				hasPreviousPage={hasPreviousPage}
				baseUrl={`/dashboard/movies/${id}/${categoryId}`}
			/>
		</div>
	);
}
