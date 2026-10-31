import { createPageMetadata, getChannelMetadataContext } from "@/app/metadata";
import { CopyStreamButton } from "@/components/copy-stream-button";
import { ExternalStreamLink } from "@/components/external-stream-link";
import { ItemActionButtons } from "@/components/item-action-buttons";
import type { ChannelDetailPageProps as PageProps } from "@/components/types";
import { VideoPlayer } from "@/components/video-player";
import { toSafeImageSrc } from "@/lib/image-url";
import { getCachedChannel } from "@/server/cached-content";
import { getItemStatus } from "@/server/user-items";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import { Radio } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
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

export default function ChannelDetailPage({ params }: PageProps) {
	return <ChannelDetailContent params={params} />;
}

async function ChannelDetailContent({ params }: PageProps) {
	const { id, categoryId, channelId } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const channel = await getCachedChannel(id, playlist, categoryId, channelId);

	if (!channel) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);

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
		<div className="w-full max-w-2xl space-y-5">
			<header className="flex items-center gap-4">
				<div className="flex size-14 shrink-0 items-center justify-center">
					{safeLogoSrc ? (
						<Image
							src={safeLogoSrc}
							alt={channel.name}
							width={56}
							height={56}
							unoptimized
							className="size-full object-contain p-2"
						/>
					) : (
						<Radio className="size-6 text-muted-foreground/60" />
					)}
				</div>
				<div className="min-w-0 space-y-1">
					<h1 className="truncate text-xl font-semibold tracking-tight">
						{channel.name}
					</h1>
					<p className="truncate text-sm text-muted-foreground">
						{[
							channel.number > 0 ? `Channel ${channel.number}` : null,
							channel.epgId,
						]
							.filter(Boolean)
							.join(", ")}
					</p>
				</div>
			</header>

			<div className="overflow-hidden rounded-lg border border-border/60 bg-card">
				{/* HLS first; some providers only serve raw MPEG-TS. */}
				<VideoPlayer
					live
					title={channel.name}
					// The desktop app plays the provider's own address with mpv.
					desktopUrl={/^https?:\/\//i.test(streamUrl) ? streamUrl : undefined}
					sources={[
						{
							kind: "hls",
							src: `/api/stream/live/${encodeURIComponent(id)}/${encodeURIComponent(channelId)}?ext=m3u8`,
						},
						{
							kind: "mpegts",
							src: `/api/stream/live/${encodeURIComponent(id)}/${encodeURIComponent(channelId)}?ext=ts`,
						},
					]}
				/>
			</div>

			<div className="flex flex-wrap items-center justify-end gap-2 text-sm">
				<CopyStreamButton url={streamUrl} />
				<ExternalStreamLink
					href={streamUrl}
					label="Read the content in another player"
				/>
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
	);
}
