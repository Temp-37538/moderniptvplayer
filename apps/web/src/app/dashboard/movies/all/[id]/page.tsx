import "server-only"; 
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamMovieListing } from "@iptv/xtream-api/standardized";
import { PackageOpen } from "lucide-react";
import { AllMoviesView } from "@/components/all-movies-view";

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
		<div className="h-full">
			{movies.length > 0 ? (
				<AllMoviesView movies={movies} playlistId={id} />
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
