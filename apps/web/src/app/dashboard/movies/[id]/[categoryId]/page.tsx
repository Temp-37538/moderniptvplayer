import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import type { StandardXtreamMovieListing } from "@iptv/xtream-api/standardized";

import { Button } from "@/components/ui/button";
import {
	ChevronLeft,
	ChevronRight,
	Film,
	Star,
	PackageOpen,
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
	searchParams: Promise<{ page?: string }>;
};

export default async function MoviesByCategoryPage({
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

	const movies = (await xtream.getMovies({
		categoryId,
		page: currentPage,
		limit: ITEMS_PER_PAGE,
	})) as StandardXtreamMovieListing[];

	const hasNextPage = movies.length === ITEMS_PER_PAGE;
	const hasPreviousPage = currentPage > 1;

	return (
		<div className="h-full overflow-y-auto  ">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Film className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Movies</h1>
						<p className="text-sm text-muted-foreground">Page {currentPage}</p>
					</div>
				</div>
			</div>
			{movies.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6  gap-4">
					{movies.map((movie) => (
						<Link
							key={movie.id}
							href={`/dashboard/movies/${id}/${categoryId}/${movie.id}`}
							className="group"
						>
							<div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
								{movie.poster ? (
									<img
										src={movie.poster}
										alt={movie.name}
										className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								) : (
									<div className="flex items-center justify-center size-full text-muted-foreground">
										<Film className="size-10 opacity-50" />
									</div>
								)}
								{movie.voteAverage > 0 && (
									<div className="absolute top-2 right-2 rounded-md bg-amber-500/90 text-amber-50 text-xs font-semibold px-2 py-1 flex items-center gap-1">
										<Star className="size-3 fill-amber-50" />
										{Number(movie.voteAverage).toFixed(1)}
									</div>
								)}
							</div>
							<h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
								{movie.name}
							</h3>
						</Link>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">
						No movies in this category
					</p>
					<p className="text-sm">Try another category.</p>
				</div>
			)}
			{(hasPreviousPage || hasNextPage) && (
				<nav className="flex items-center justify-center gap-2 mt-8">
					{hasPreviousPage ? (
						<Button
							nativeButton={false}
							variant="outline"
							size="sm"
							render={
								<Link
									href={`/dashboard/movies/${id}/${categoryId}?page=${currentPage - 1}`}
								/>
							}
						>
							<ChevronLeft className="size-4" />
							Previous
						</Button>
					) : (
						<Button variant="outline" size="sm" disabled>
							<ChevronLeft className="size-4" />
							Previous
						</Button>
					)}
					<span className="px-3 py-1 text-sm text-muted-foreground tabular-nums">
						Page {currentPage}
					</span>
					{hasNextPage ? (
						<Button
							nativeButton={false}
							variant="outline"
							size="sm"
							render={
								<Link
									href={`/dashboard/movies/${id}/${categoryId}?page=${currentPage + 1}`}
								/>
							}
						>
							Next
							<ChevronRight className="size-4" />
						</Button>
					) : (
						<Button variant="outline" size="sm" disabled>
							Next
							<ChevronRight className="size-4" />
						</Button>
					)}
				</nav>
			)}
		</div>
	);
}
