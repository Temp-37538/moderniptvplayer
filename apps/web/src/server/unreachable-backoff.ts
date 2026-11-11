/**
 * Remembers, per provider, that a request just timed out, so the calls that
 * follow can fail at once for `windowMs` instead of each waiting for its own
 * timeout.
 */
export function createUnreachableBackoff(
	windowMs: number,
	now: () => number = Date.now,
) {
	const until = new Map<string, number>();
	return {
		isBlocked(key: string): boolean {
			const end = until.get(key);
			if (end === undefined) {
				return false;
			}
			if (end > now()) {
				return true;
			}
			until.delete(key);
			return false;
		},
		markTimedOut(key: string) {
			until.set(key, now() + windowMs);
		},
	};
}
