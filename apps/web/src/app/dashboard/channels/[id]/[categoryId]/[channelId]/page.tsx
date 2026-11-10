import { createPageMetadata, getChannelMetadataContext } from "@/app/metadata";
import { CopyStreamButton } from "@/components/copy-stream-button";
import { ExternalStreamLink } from "@/components/external-stream-link";
import { ItemActionButtons } from "@/components/item-action-buttons";
import type { ChannelDetailPageProps as PageProps } from "@/components/types";
import { CatalogCrumbs } from "@/components/catalog-crumbs";
import { VideoPlayer } from "@/components/video-player";
import { toSafeImageSrc } from "@/lib/image-url";
import { withStreamCategory } from "@/lib/stream-category";
import { liveSourceKind } from "@/server/m3u";
import { getCachedChannel } from "@/server/cached-content";
import { assertCategoryAvailable } from "@/server/category-access";
import { readCategoryIds } from "@/server/category-preference-policy";
import { getItemStatus } from "@/server/user-items";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import { Radio } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

export const instant = false;

function entryUrl(value: object): string {
	if ("url" in value && typeof value.url === "string") {
		return value.url;
	}
	return "";
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { id, categoryId, channelId } = await params;
	await assertCategoryAvailable(id, "channel", categoryId);
	const context = await getChannelMetadataContext(id, categoryId, channelId);
	await assertCategoryAvailable(
		id,
		"channel",
		categoryId,
		readCategoryIds(context?.channel),
	);
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

	await assertCategoryAvailable(id, "channel", categoryId);

	const channel = await getCachedChannel(id, playlist, categoryId, channelId);

	if (!channel) {
		notFound();
	}

	await assertCategoryAvailable(
		id,
		"channel",
		categoryId,
		readCategoryIds(channel),
	);

	const streamUrl =
		playlist.source === "M3U"
			? entryUrl(channel)
			: createXtreamClient(playlist).generateStreamUrl({
					type: "channel",
					streamId: channelId,
					extension: "m3u8",
				});
	if (!streamUrl) {
		notFound();
	}
	const liveKind = playlist.source === "M3U" ? liveSourceKind(streamUrl) : null;

	const itemStatus = await getItemStatus(id, channelId, "channel");
	const safeLogoSrc = toSafeImageSrc(channel.logo);

	return (
		<div className="w-full max-w-2xl space-y-5">
			<header className="flex items-center gap-4">
				<CatalogCrumbs
					section="channels"
					playlistId={id}
					categoryId={categoryId}
					itemId={channelId}
					itemName={channel.name}
				/>
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
					sources={
						liveKind === "mpegts"
							? [
									{
										kind: "mpegts" as const,
										src: withStreamCategory(
											`/api/stream/live/${encodeURIComponent(id)}/${encodeURIComponent(channelId)}?ext=ts`,
											categoryId,
										),
									},
								]
							: liveKind === "hls"
								? [
										{
											kind: "hls" as const,
											src: withStreamCategory(
												`/api/stream/live/${encodeURIComponent(id)}/${encodeURIComponent(channelId)}?ext=m3u8`,
												categoryId,
											),
										},
									]
								: [
										{
											kind: "hls" as const,
											src: withStreamCategory(
												`/api/stream/live/${encodeURIComponent(id)}/${encodeURIComponent(channelId)}?ext=m3u8`,
												categoryId,
											),
										},
										{
											kind: "mpegts" as const,
											src: withStreamCategory(
												`/api/stream/live/${encodeURIComponent(id)}/${encodeURIComponent(channelId)}?ext=ts`,
												categoryId,
											),
										},
									]
					}
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
