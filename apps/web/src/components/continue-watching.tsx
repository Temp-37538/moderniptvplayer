import { ContinueWatchingRail } from "@/components/continue-watching-rail";
import { toSafeImageSrc } from "@/lib/image-url";
import { formatTimeLeft, progressPercent } from "@/lib/watch-progress-format";
import type { ContinueWatchingItem } from "@/server/watch-progress";

/** The "Continue watching" section; renders nothing when it is empty. */
export function ContinueWatching({
	items,
	playlistNames,
}: {
	items: ContinueWatchingItem[];
	/** Playlist names by id, shown on each card when there are several. */
	playlistNames: Record<string, string>;
}) {
	if (items.length === 0) {
		return null;
	}
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
