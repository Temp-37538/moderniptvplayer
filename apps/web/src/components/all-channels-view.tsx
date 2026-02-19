"use client";
import { SearchForm } from "@/components/search-form";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";
import { Radio } from "lucide-react";
import { useState } from "react";
import { AllChannelsVirtualList } from "@/components/all-virtualized";

type AllChannelsViewProps = {
	channels: StandardXtreamChannel[];
	playlistId: string;
};

export function AllChannelsView({
	channels,
	playlistId,
}: AllChannelsViewProps) {
	const [query, setQuery] = useState("");

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Radio className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							All Channels
						</h1>
						<p className="text-sm text-muted-foreground">
							{channels.length} channels
						</p>
					</div>
				</div>
				<SearchForm
					placeholder="Search a channel"
					className="md:w-70 w-full"
					inputProps={{
						value: query,
						onChange: (event) => setQuery(event.target.value),
					}}
				/>
			</div>
			<AllChannelsVirtualList
				channels={channels}
				playlistId={playlistId}
				searchQuery={query}
			/>
		</div>
	);
}
