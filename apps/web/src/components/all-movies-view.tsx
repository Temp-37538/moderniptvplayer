"use client";
import { SearchForm } from "@/components/search-form";
import type { StandardXtreamMovieListing } from "@iptv/xtream-api/standardized";
import { Film } from "lucide-react";
import { useState } from "react";
import { AllMoviesVirtualGrid } from "@/components/all-virtualized";

type AllMoviesViewProps = {
	movies: StandardXtreamMovieListing[];
	playlistId: string;
};

export function AllMoviesView({
	movies,
	playlistId,
}: AllMoviesViewProps) {
	const [query, setQuery] = useState("");

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Film className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							All Movies
						</h1>
						<p className="text-sm text-muted-foreground">
							{movies.length} movies
						</p>
					</div>
				</div>
				<SearchForm
					placeholder="Search a movie"
					className="md:w-70 w-full"
					inputProps={{
						value: query,
						onChange: (event) => setQuery(event.target.value),
					}}
				/>
			</div>
			<AllMoviesVirtualGrid
				movies={movies}
				playlistId={playlistId}
				searchQuery={query}
			/>
		</div>
	);
}
