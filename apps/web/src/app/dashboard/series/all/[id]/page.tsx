import "server-only";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { PackageOpen } from "lucide-react";
import { AllSeriesView } from "@/components/all-series-view";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function AllSeriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const shows = (await xtream.getShows()) as Array<
		Omit<StandardXtreamShow, "seasons">
	>;

	return (
		<div className="h-full">
			{shows.length > 0 ? (
				<AllSeriesView shows={shows} playlistId={id} />
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">No series in this playlist</p>
					<p className="text-sm">Try another playlist.</p>
				</div>
			)}
		</div>
	);
}