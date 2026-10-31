import type { ProgressDetails } from "@/lib/player/types";

export const SAVE_INTERVAL_MS = 15_000;
// Opening a title for a few seconds must not clutter "continue watching".
export const MIN_SAVED_POSITION = 10;

export type PlaybackSample = {
	position: number;
	duration: number;
	ended: boolean;
};

/**
 * Decides when the playback position is stored, and stores it. One instance
 * per playback: it remembers what it last sent. The web player (a video
 * element) and the desktop player (mpv) feed it the same way.
 */
export class ProgressSaver {
	private lastSentAt = 0;
	private lastSentPosition = -1;
	private readonly getDetails: () => ProgressDetails | undefined;

	constructor(getDetails: () => ProgressDetails | undefined) {
		this.getDetails = getDetails;
	}

	save(sample: PlaybackSample, force: boolean) {
		const details = this.getDetails();
		const { position, duration } = sample;
		if (
			!details ||
			!Number.isFinite(duration) ||
			duration <= 0 ||
			position < MIN_SAVED_POSITION
		) {
			return;
		}
		// Reaching the end must always be recorded, however close the previous
		// save was: it is what marks the title as watched.
		const finished = sample.ended || position >= duration - 1;
		if (finished) {
			if (this.lastSentPosition >= duration - 1) {
				return;
			}
		} else if (
			(!force && Date.now() - this.lastSentAt < SAVE_INTERVAL_MS) ||
			Math.abs(position - this.lastSentPosition) < 3
		) {
			return;
		}
		this.lastSentAt = Date.now();
		this.lastSentPosition = finished ? duration : position;

		const image = details.itemImage;
		// keepalive lets the request outlive the page (tab closed).
		fetch("/api/watch-progress", {
			method: "POST",
			keepalive: true,
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				playlistId: details.playlistId,
				itemId: details.itemId,
				itemType: details.itemType,
				itemName: details.itemName,
				itemUrl: details.itemUrl,
				itemImage:
					image && /^https?:\/\//i.test(image) && image.length <= 2048
						? image
						: null,
				showId: details.showId ?? null,
				positionSec: finished ? duration : position,
				durationSec: duration,
			}),
		}).catch(() => {});
	}
}
