import { ContinueWatchingRail } from "@/components/continue-watching-rail";
import { toSafeImageSrc } from "@/lib/image-url";
import { formatTimeLeft, progressPercent } from "@/lib/watch-progress-format";
import { getContinueWatching } from "@/server/watch-progress";

export async function ContinueWatching({
	playlistNames,
}: {
	/** Playlist names by id, shown on each card when there are several. */
	playlistNames: Record<string, string>;
}) {
	const items = await getContinueWatching();
	const showPlaylist = Object.keys(playlistNames).length > 1;

	return (
		<ContinueWatchingRail
			items={items.map((item) => ({
				id: item.id,
				playlistId: item.playlistId,
				showId: item.showId,
				title: item.itemName,
				href: item.itemUrl,
				image: toSafeImageSrc(item.itemImage ?? undefined) ?? null,
				percent: progressPercent(item.positionSec, item.durationSec),
				timeLeft: formatTimeLeft(item.positionSec, item.durationSec),
				playlistName: showPlaylist
					? (playlistNames[item.playlistId] ?? null)
					: null,
			}))}
		/>
	);
}
