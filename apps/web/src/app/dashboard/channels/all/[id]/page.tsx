import "server-only";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";
import { PackageOpen } from "lucide-react";
import { AllChannelsView } from "@/components/all-channels-view";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function AllChannelsPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const channels = (await xtream.getChannels()) as StandardXtreamChannel[];

	return (
		<div className="h-full">
			{channels.length > 0 ? (
				<AllChannelsView channels={channels} playlistId={id} />
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">No channels in this playlist</p>
					<p className="text-sm">Try another playlist.</p>
				</div>
			)}
		</div>
	);
}
