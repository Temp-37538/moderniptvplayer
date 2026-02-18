import { CopyStreamButton } from "@/components/copy-stream-button";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";
import { ExternalLink, Hash, Radio, Satellite } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import "server-only";

type PageProps = {
	params: Promise<{ id: string; categoryId: string; channelId: string }>;
};

export default async function ChannelDetailPage({ params }: PageProps) {
	const { id, categoryId, channelId } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);

	const allChannels = (await xtream.getChannels({
		categoryId,
	})) as StandardXtreamChannel[];

	const channel = allChannels.find((ch) => ch.id === channelId);

	if (!channel) {
		notFound();
	}

	const streamUrl = xtream.generateStreamUrl({
		type: "channel",
		streamId: channelId,
		extension: "m3u8",
	});

	return ( 
			<div className="max-w-2xl">
				<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
					<div className="flex items-center gap-6 p-6 bg-muted/20">
						<div className="flex items-center justify-center size-24 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/30">
							{channel.logo ? (
								<img
									src={channel.logo}
									alt={channel.name}
									className="size-full object-contain p-2"
								/>
							) : (
								<Radio className="size-10 text-muted-foreground/30" />
							)}
						</div>
						<div className="space-y-2">
							<h1 className="text-2xl font-bold tracking-tight">
								{channel.name}
							</h1>
							<div className="flex flex-wrap items-center gap-2">
								{channel.number > 0 && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Hash className="size-3.5" />
										Channel {channel.number}
									</span>
								)}
								{channel.epgId && (
									<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
										<Satellite className="size-3.5" />
										{channel.epgId}
									</span>
								)}
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-3 p-6 border-t border-border/30">
						<CopyStreamButton url={streamUrl} />
						<Link
							variant="outline"
							href={channel.url}
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLink className="size-4" />
							Direct URL
						</Link>
					</div>
				</div>
			</div> 
	);
}
