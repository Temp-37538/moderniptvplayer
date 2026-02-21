import "server-only";
import type { IdCategoryPageProps as PageProps } from "@/components/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";

import { Radio } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PaginationNav } from "@/components/pagination-nav";

const ITEMS_PER_PAGE = 20;

export default async function ChannelsByCategoryPage({
	params,
	searchParams,
}: PageProps) {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = Number(pageParam) || 1;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);

	const channels = (await xtream.getChannels({
		categoryId,
		page: currentPage,
		limit: ITEMS_PER_PAGE,
	})) as StandardXtreamChannel[];

	const hasNextPage = channels.length === ITEMS_PER_PAGE;
	const hasPreviousPage = currentPage > 1;

	return (
		<div className="h-full overflow-y-auto ">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Radio className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Channels</h1>
						<p className="text-sm text-muted-foreground">Page {currentPage}</p>
					</div>
				</div>
			</div>
			{channels.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{channels.map((channel) => (
						<Link
							key={channel.id}
							href={`/dashboard/channels/${id}/${categoryId}/${channel.id}`}
							className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5"
						>
							<div className="flex items-center justify-center size-12 rounded-lg bg-muted overflow-hidden shrink-0">
								{channel.logo ? (
									<img
										src={channel.logo}
										alt={channel.name}
										className="size-full object-contain p-1"
									/>
								) : (
									<Radio className="size-5 text-muted-foreground/40" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<h3 className="text-sm font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
									{channel.name}
								</h3>
								{channel.number > 0 && (
									<p className="text-xs text-muted-foreground mt-0.5">
										Ch. {channel.number}
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			) : (
				<EmptyState
					title="No channels in this category"
					description="Try another category."
				/>
			)}
			<PaginationNav
				currentPage={currentPage}
				hasNextPage={hasNextPage}
				hasPreviousPage={hasPreviousPage}
				baseUrl={`/dashboard/channels/${id}/${categoryId}`}
			/>
		</div>
	);
}
