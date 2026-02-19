import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamMovieListing } from "@iptv/xtream-api/standardized";
import { Film, PackageOpen, Star } from "lucide-react";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function AllMoviesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const movies = (await xtream.getMovies()) as StandardXtreamMovieListing[];

	return (
		<div className="h-full overflow-y-auto  ">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Film className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">All Movies</h1>
						<p className="text-sm text-muted-foreground">
							{movies.length} movies
						</p>
					</div>
				</div>
			</div>
			{movies.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6  gap-4">
					{movies.map((movie) => {
						const categoryId = movie.categoryIds?.[0] ?? "0";
						return (
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
						);
					})}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">No movies in this playlist</p>
					<p className="text-sm">Try another playlist.</p>
				</div>
			)}
		</div>
	);
}
