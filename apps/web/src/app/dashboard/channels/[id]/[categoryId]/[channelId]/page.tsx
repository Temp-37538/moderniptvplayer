import { createPageMetadata, getChannelMetadataContext } from "@/app/metadata";
import type { ChannelDetailPageProps as PageProps } from "@/components/types";
import { CopyStreamButton } from "@/components/copy-stream-button";
import { ItemActionButtons } from "@/components/item-action-buttons";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getItemStatus } from "@/server/user-items";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";
import { ExternalLink, Hash, Radio, Satellite } from "lucide-react";
import { notFound } from "next/navigation"; 
import { toSafeImageSrc } from "@/lib/image-url";

export async function generateMetadata({ params }: PageProps) {
	const { id, categoryId, channelId } = await params;
	const context = await getChannelMetadataContext(id, categoryId, channelId);
	const channelName = context?.channel?.name ?? "Channel Details";

	return createPageMetadata({
		title: channelName,
		description: context?.playlist
			? `View stream details for ${channelName} from ${context.playlist.playlistName}.`
			: "View stream details for this channel.",
		path: `/dashboard/channels/${id}/${categoryId}/${channelId}`,
		noIndex: true,
	});
}

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
	if (!streamUrl) {
		notFound();
	}

	const itemStatus = await getItemStatus(id, channelId, "channel");
	const safeLogoSrc = toSafeImageSrc(channel.logo);

	return (
		<div className="max-w-2xl">
			<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
				<div className="flex items-center gap-6 p-6 bg-muted/20">
					<div className="flex items-center justify-center size-24 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/30">
						{safeLogoSrc ? (
							<img
								src={safeLogoSrc}
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
					<Tooltip>
						<TooltipTrigger
							render={
								<a
									href={streamUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors"
								>
									<ExternalLink className="size-4" />
								</a>
							}
						/>
						<TooltipContent>
							<p>{"Read the content in another player"}</p>
						</TooltipContent>
					</Tooltip>
					<ItemActionButtons
						playlistId={id}
						itemId={channelId}
						itemType="channel"
						itemName={channel.name}
						itemUrl={`/dashboard/channels/${id}/${categoryId}/${channelId}`}
						isWatchLater={itemStatus.isWatchLater}
						isFavorite={itemStatus.isFavorite}
					/>
				</div>
			</div>
		</div>
	);
}
