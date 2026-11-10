import { createPageMetadata, getCategoryMetadataContext } from "@/app/metadata";
import type { IdCategoryPageProps as PageProps } from "@/components/types";
import { getCachedChannelsPage } from "@/server/cached-content";
import {
	assertCategoryAvailable,
	filterBrowsableItems,
} from "@/server/category-access";
import { pageCount } from "@/server/pagination";
import { getPlaylistById } from "@/server/xtream";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbLabel } from "@/components/breadcrumb-labels";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PaginationNav } from "@/components/pagination-nav";
import { toSafeImageSrc } from "@/lib/image-url";
import { Radio } from "lucide-react";
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
	const currentPage = Number(pageParam) || 1;
	await assertCategoryAvailable(id, "channel", categoryId);
	const context = await getCategoryMetadataContext("channels", id, categoryId);
	const categoryTitle = context?.categoryName ?? "Channels";
	const pageSuffix = currentPage > 1 ? `, page ${currentPage}` : "";

	return createPageMetadata({
		title: categoryTitle,
		description: context?.playlist
			? `Browse ${categoryTitle.toLowerCase()} from ${context.playlist.playlistName}${pageSuffix}.`
			: `Browse channels in this category${pageSuffix}.`,
		path:
			currentPage > 1
				? `/dashboard/channels/${id}/${categoryId}?page=${currentPage}`
				: `/dashboard/channels/${id}/${categoryId}`,
		noIndex: true,
	});
}

export default function ChannelsByCategoryPage({
	params,
	searchParams,
}: PageProps) {
	return (
		<ChannelsByCategoryContent params={params} searchParams={searchParams} />
	);
}

async function ChannelsByCategoryContent({ params, searchParams }: PageProps) {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = Number(pageParam) || 1;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	await assertCategoryAvailable(id, "channel", categoryId);

	const [{ items: channels, total }, context] = await Promise.all([
		getCachedChannelsPage(id, categoryId, currentPage, ITEMS_PER_PAGE),
		getCategoryMetadataContext("channels", id, categoryId),
	]);
	// Pages count the raw rows, before the visibility filter.
	const totalPages = pageCount(total, ITEMS_PER_PAGE);
	const hasNextPage = currentPage < totalPages;
	const visibleChannels = await filterBrowsableItems(
		id,
		"channel",
		categoryId,
		channels,
	);

	const hasPreviousPage = currentPage > 1;
	const categoryName = context?.categoryName ?? "Channels";

	return (
		<PageContainer>
			<BreadcrumbLabel
				href={`/dashboard/channels/${id}/${categoryId}`}
				label={context?.categoryName}
			/>
			<PageHeader
				title={categoryName}
				description={
					totalPages > 1
						? `Channels, page ${currentPage} of ${totalPages}`
						: "Channels"
				}
			/>
			{visibleChannels.length > 0 ? (
				// The logo carries the tile: no card, the name and number under it.
				<ul className="grid grid-cols-2 gap-x-4 gap-y-6 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
					{visibleChannels.map((channel) => {
						const safeLogoSrc = toSafeImageSrc(channel.logo);
						return (
							<li key={channel.id}>
								<Link
									href={`/dashboard/channels/${id}/${categoryId}/${channel.id}`}
									className="group block outline-none"
								>
									<div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted/40 transition-colors group-hover:bg-muted/80 group-focus-visible:ring-2 group-focus-visible:ring-ring">
										{safeLogoSrc ? (
											<Image
												src={safeLogoSrc}
												alt=""
												fill
												unoptimized
												sizes="(min-width: 1024px) 200px, 45vw"
												className="object-contain p-[18%] transition-transform duration-200 group-hover:scale-105"
											/>
										) : (
											<Radio className="size-6 text-muted-foreground/50" />
										)}
									</div>
									<div className="mt-2 flex items-baseline gap-2">
										<h3 className="min-w-0 flex-1 truncate text-sm font-medium">
											{channel.name}
										</h3>
										{channel.number > 0 && (
											<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
												{channel.number}
											</span>
										)}
									</div>
								</Link>
							</li>
						);
					})}
				</ul>
			) : (
				<EmptyState
					title={
						hasPreviousPage || hasNextPage
							? "Nothing to show on this page"
							: "No channels in this category"
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
				baseUrl={`/dashboard/channels/${id}/${categoryId}`}
			/>
		</PageContainer>
	);
}
