import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import { FallbackImage } from "@/components/fallback-image";
import { BreadcrumbLabel } from "@/components/breadcrumb-labels";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PaginationNav } from "@/components/pagination-nav";
import type { IdCategoryPageProps as PageProps } from "@/components/types";
import { toSafeImageSrc } from "@/lib/image-url";
import { getCachedShowsPage } from "@/server/cached-content";
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
import { Tv } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
	await assertCategoryAvailable(id, "series", categoryId);
	const context = await getCategoryMetadataContext("series", id, categoryId);
	const categoryTitle = context?.categoryName ?? "Series";
	const pageSuffix = currentPage > 1 ? `, page ${currentPage}` : "";

	return createPageMetadata({
		title: categoryTitle,
		description: context?.playlist
			? `Browse ${categoryTitle.toLowerCase()} from ${context.playlist.playlistName}${pageSuffix}.`
			: `Browse series in this category${pageSuffix}.`,
		path:
			currentPage > 1
				? `/dashboard/series/${id}/${categoryId}?page=${currentPage}`
				: `/dashboard/series/${id}/${categoryId}`,
		noIndex: true,
	});
}

export default function SeriesByCategoryPage({
	params,
	searchParams,
}: PageProps) {
	return (
		<SeriesByCategoryContent params={params} searchParams={searchParams} />
	);
}

async function SeriesByCategoryContent({ params, searchParams }: PageProps) {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = parsePageParam(pageParam) ?? 1;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	await assertCategoryAvailable(id, "series", categoryId);

	const [{ items: shows, total }, context] = await Promise.all([
		getCachedShowsPage(id, categoryId, currentPage, ITEMS_PER_PAGE),
		getCategoryMetadataContext("series", id, categoryId),
	]);
	// Pages count the raw rows, before the visibility filter.
	const totalPages = pageCount(total, ITEMS_PER_PAGE);
	const redirectPage = pageRedirectTarget(pageParam, totalPages);
	if (redirectPage !== null) {
		redirect(
			`/dashboard/series/${id}/${categoryId}${redirectPage > 1 ? `?page=${redirectPage}` : ""}`,
		);
	}
	const hasNextPage = currentPage < totalPages;
	const visibleShows = await filterBrowsableItems(
		id,
		"series",
		categoryId,
		shows,
	);

	const hasPreviousPage = currentPage > 1;
	const categoryName = context?.categoryName ?? "Series";

	return (
		<PageContainer>
			<BreadcrumbLabel
				href={`/dashboard/series/${id}/${categoryId}`}
				label={context?.categoryName}
			/>
			<PageHeader
				title={categoryName}
				description={
					totalPages > 1
						? `Series, page ${currentPage} of ${totalPages}`
						: "Series"
				}
			/>
			{visibleShows.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{visibleShows.map((show) => {
						const safePosterSrc = toSafeImageSrc(show.poster);
						return (
							<Link
								key={show.id}
								href={`/dashboard/series/${id}/${categoryId}/${show.id}`}
								className="group"
							>
								<div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
									{safePosterSrc ? (
										<FallbackImage
											src={safePosterSrc}
											alt=""
											fill
											sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 768px) 24vw, (min-width: 640px) 32vw, 48vw"
											unoptimized
											className="object-cover transition-transform duration-300 group-hover:scale-105"
											fallback={
												<div className="flex items-center justify-center size-full text-muted-foreground">
													<Tv className="size-10 opacity-50" />
												</div>
											}
										/>
									) : (
										<div className="flex items-center justify-center size-full text-muted-foreground">
											<Tv className="size-10 opacity-50" />
										</div>
									)}
								</div>
								<h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
									{show.name}
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
							: "No series in this category"
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
				baseUrl={`/dashboard/series/${id}/${categoryId}`}
			/>
		</PageContainer>
	);
}
