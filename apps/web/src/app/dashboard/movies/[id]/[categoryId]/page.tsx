import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import type { IdCategoryPageProps as PageProps } from "@/components/types";
import { getCachedMoviesPage } from "@/server/cached-content";
import {
	assertCategoryAvailable,
	filterBrowsableItems,
} from "@/server/category-access";
import {
	pageCount,
	pageRedirectTarget,
	parsePageParam,
} from "@/server/pagination";
import { getPlaylistById } from "@/server/xtream";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BreadcrumbLabel } from "@/components/breadcrumb-labels";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PaginationNav } from "@/components/pagination-nav";
import { toSafeImageSrc } from "@/lib/image-url";
import { Film } from "lucide-react";
import Image from "next/image";

export const instant = false;

// 24 fills whole rows in the 1 to 6 column grids.
const ITEMS_PER_PAGE = 24;

export async function generateMetadata({
	params,
	searchParams,
}: PageProps): Promise<Metadata> {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = parsePageParam(pageParam) ?? 1;
	await assertCategoryAvailable(id, "movie", categoryId);
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
	const currentPage = parsePageParam(pageParam) ?? 1;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	await assertCategoryAvailable(id, "movie", categoryId);

	const [{ items: movies, total }, context] = await Promise.all([
		getCachedMoviesPage(id, categoryId, currentPage, ITEMS_PER_PAGE),
		getCategoryMetadataContext("movies", id, categoryId),
	]);
	// Pages count the raw rows, before the visibility filter.
	const totalPages = pageCount(total, ITEMS_PER_PAGE);
	const redirectPage = pageRedirectTarget(pageParam, totalPages);
	if (redirectPage !== null) {
		redirect(
			`/dashboard/movies/${id}/${categoryId}${redirectPage > 1 ? `?page=${redirectPage}` : ""}`,
		);
	}
	const hasNextPage = currentPage < totalPages;
	const visibleMovies = await filterBrowsableItems(
		id,
		"movie",
		categoryId,
		movies,
	);

	const hasPreviousPage = currentPage > 1;
	const categoryName = context?.categoryName ?? "Movies";

	return (
		<PageContainer>
			<BreadcrumbLabel
				href={`/dashboard/movies/${id}/${categoryId}`}
				label={context?.categoryName}
			/>
			<PageHeader
				title={categoryName}
				description={
					totalPages > 1
						? `Movies, page ${currentPage} of ${totalPages}`
						: "Movies"
				}
			/>
			{visibleMovies.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6  gap-4">
					{visibleMovies.map((movie) => {
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
											alt=""
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
					title={
						hasPreviousPage || hasNextPage
							? "Nothing to show on this page"
							: "No movies in this category"
					}
					description={
						hasPreviousPage || hasNextPage
							? "Try the next or previous page."
							: "Try another category."
					}
				/>
			)}
			<PaginationNav
				currentPage={currentPage}
				totalPages={totalPages}
				hasNextPage={hasNextPage}
				hasPreviousPage={hasPreviousPage}
				baseUrl={`/dashboard/movies/${id}/${categoryId}`}
			/>
		</PageContainer>
	);
}
