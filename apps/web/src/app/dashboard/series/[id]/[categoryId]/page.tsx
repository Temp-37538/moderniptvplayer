import "server-only";
import type { IdCategoryPageProps as PageProps } from "@/components/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { Tv, Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PaginationNav } from "@/components/pagination-nav";

const ITEMS_PER_PAGE = 20;

export default async function SeriesByCategoryPage({
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

	const shows = (await xtream.getShows({
		categoryId,
		page: currentPage,
		limit: ITEMS_PER_PAGE,
	})) as unknown as Array<Omit<StandardXtreamShow, "seasons">>;

	const hasNextPage = shows.length === ITEMS_PER_PAGE;
	const hasPreviousPage = currentPage > 1;

	return (
		<div className="h-full overflow-y-auto  ">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Tv className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Series</h1>
						<p className="text-sm text-muted-foreground">Page {currentPage}</p>
					</div>
				</div>
			</div>
			{shows.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{shows.map((show) => (
						<Link
							key={show.id}
							href={`/dashboard/series/${id}/${categoryId}/${show.id}`}
							className="group"
						>
							<div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
								{show.poster ? (
									<img
										src={show.poster}
										alt={show.name}
										className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								) : (
									<div className="flex items-center justify-center size-full text-muted-foreground">
										<Tv className="size-10 opacity-50" />
									</div>
								)}
								{show.voteAverage > 0 && (
									<div className="absolute top-2 right-2 rounded-md bg-amber-500/90 text-amber-50 text-xs font-semibold px-2 py-1 flex items-center gap-1">
										<Star className="size-3 fill-amber-50" />
										{Number(show.voteAverage).toFixed(1)}
									</div>
								)}
							</div>
							<h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
								{show.name}
							</h3>
						</Link>
					))}
				</div>
			) : (
				<EmptyState
					title="No series in this category"
					description="Try another category."
				/>
			)}
			<PaginationNav
				currentPage={currentPage}
				hasNextPage={hasNextPage}
				hasPreviousPage={hasPreviousPage}
				baseUrl={`/dashboard/series/${id}/${categoryId}`}
			/>
		</div>
	);
}
