"use client";
import { SearchForm } from "@/components/search-form";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { Tv } from "lucide-react";
import { useState } from "react";
import { AllSeriesVirtualGrid } from "@/components/all-virtualized";

type AllSeriesViewProps = {
	shows: Array<Omit<StandardXtreamShow, "seasons">>;
	playlistId: string;
};

export function AllSeriesView({
	shows,
	playlistId,
}: AllSeriesViewProps) {
	const [query, setQuery] = useState("");

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Tv className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							All Series
						</h1>
						<p className="text-sm text-muted-foreground">
							{shows.length} series
						</p>
					</div>
				</div>
				<SearchForm
					placeholder="Search a serie"
					className="md:w-70 w-full"
					inputProps={{
						value: query,
						onChange: (event) => setQuery(event.target.value),
					}}
				/>
			</div>
			<AllSeriesVirtualGrid
				shows={shows}
				playlistId={playlistId}
				searchQuery={query}
			/>
		</div>
	);
}
