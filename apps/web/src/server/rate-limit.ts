import "server-only";

type Bucket = { count: number; resetAt: number };

// In-process fixed-window limiter. Enough to stop a single account from using
// server actions as a scanner on one instance; it is not shared across
// instances.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export function checkRateLimit(key: string, limit: number, windowMs: number) {
	const now = Date.now();

	if (buckets.size > MAX_BUCKETS) {
		for (const [bucketKey, bucket] of buckets) {
			if (bucket.resetAt <= now) {
				buckets.delete(bucketKey);
			}
		}
	}

	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, retryAfterSeconds: 0 };
	}

	if (bucket.count >= limit) {
		return {
			allowed: false,
			retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
		};
	}

	bucket.count += 1;
	return { allowed: true, retryAfterSeconds: 0 };
}
