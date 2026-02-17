import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";

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
	})) as unknown as Array<{
		id: string;
		name: string;
		plot: string;
		genre: string[];
		cast: string[];
		director: string[];
		poster: string;
		duration: number;
		voteAverage: number;
		releaseDate: string;
		categoryIds: string[];
		url: string;
	}>;

	const hasNextPage = movies.length === ITEMS_PER_PAGE;
	const hasPreviousPage = currentPage > 1;

	return (
		<div className="h-full overflow-y-auto p-6 md:p-4"> 
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Film className="size-5" />
					</div>
					<div>
						<h1 className="text-xl font-bold tracking-tight">Movies</h1>
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
							className="group relative flex flex-col rounded-xl overflow-hidden border border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
						>
							<div className="relative aspect-2/3 bg-muted overflow-hidden">
								{movie.poster ? (
									<img
										src={movie.poster}
										alt={movie.name}
										className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								) : (
									<div className="flex items-center justify-center size-full">
										<Film className="size-8 text-muted-foreground/30" />
									</div>
								)}
								{movie.voteAverage > 0 && (
									<div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-xs font-semibold text-amber-400">
										<Star className="size-3 fill-amber-400" />
										{Number(movie.voteAverage).toFixed(1)}
									</div>
								)}
							</div>
							<div className="p-3 space-y-1">
								<h3 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
									{movie.name}
								</h3>
								{movie.releaseDate && (
									<p className="text-xs text-muted-foreground">
										{new Date(movie.releaseDate).getFullYear()}
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">No movies in this category</p>
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
