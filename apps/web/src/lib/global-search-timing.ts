// Poll for as long as a sync may hold its lock, so even the lock of a killed
// sync expires while polling and the next poll starts a new one. Mirrors
// SYNC_LOCK_MS in server/catalog-index-policy.ts, which is not imported here
// to keep the server policy (and the adult category rules it pulls in) out of
// the client bundle. 5 s keeps polling at 12 requests a minute, well under the
// route's limit of 30 per user.
export const SEARCH_POLL_WINDOW_MS = 330_000;
export const SEARCH_POLL_INTERVAL_MS = 5_000;

/** Wait before "Try again" can start a new sync, from the route's retryAfter. */
export function formatRetryWait(seconds: number): string {
	return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`;
}
