import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";

import { Button } from "@/components/ui/button";
import { Radio, Play, ExternalLink, Hash, Satellite } from "lucide-react";

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

	const allChannels = (await xtream.getChannels({ categoryId })) as Array<{
		id: string;
		name: string;
		number: number;
		logo: string;
		epgId: string;
		categoryIds: string[];
		url: string;
	}>;

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
		<div className="min-h-full p-6 md:p-8">


			{/* Channel card */}
			<div className="max-w-2xl">
				<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
					{/* Hero area */}
					<div className="flex items-center gap-6 p-6 bg-muted/20">
						{/* Logo */}
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

					{/* Actions */}
					<div className="flex flex-wrap gap-3 p-6 border-t border-border/30">
						<Button nativeButton={false} render={<a href={streamUrl} target="_blank" rel="noopener noreferrer" />}>
							<Play className="size-4" />
							Watch (Stream)
						</Button>
						<Button nativeButton={false} variant="outline" render={<a href={channel.url} target="_blank" rel="noopener noreferrer" />}>
							<ExternalLink className="size-4" />
							Direct URL
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
