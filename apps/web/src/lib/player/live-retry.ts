// A live stream that drops (provider hiccup, network change) usually comes
// back after a few seconds: the player reconnects by itself a few times,
// waiting longer each time, before it shows the failure.

/** Delays before each automatic reconnection of a live stream. */
export const LIVE_RETRY_DELAYS_MS = [2_000, 4_000, 8_000] as const;

/** Wait before automatic retry number `attempt` (0-based), or null: give up. */
export function liveRetryDelay(attempt: number): number | null {
	return LIVE_RETRY_DELAYS_MS[attempt] ?? null;
}

/** Playback time after which a stream counts as back, retries refilled. */
export const LIVE_RETRY_RESET_AFTER_MS = 10_000;
