import { env } from "@moderniptvplayer/env/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toSafeRedirectPath } from "@/lib/safe-redirect";
import { getAuthenticatedUserId } from "@/server/auth-utils";
import { checkRateLimit } from "@/server/rate-limit";
import { saveWatchProgress } from "@/server/watch-progress";

const MAX_BODY_BYTES = 8 * 1024;
const TWO_DAYS_SECONDS = 2 * 24 * 60 * 60;

const isInternalPath = (value: string) =>
	value.startsWith("/dashboard/") && toSafeRedirectPath(value, "") === value;

// The body comes straight from the browser (sendBeacon on page close): every
// field is validated, and the details are only text shown back to the owner.
const bodySchema = z.object({
	playlistId: z.string().min(1).max(64),
	itemId: z.string().min(1).max(1024),
	itemType: z.enum(["movie", "episode"]),
	itemName: z
		.string()
		.min(1)
		.transform((value) => value.slice(0, 300)),
	itemUrl: z.string().max(512).refine(isInternalPath),
	itemImage: z
		.string()
		.max(2048)
		.refine((value) => /^https?:\/\//i.test(value))
		.nullish(),
	showId: z.string().max(64).nullish(),
	positionSec: z.number().finite().min(0).max(TWO_DAYS_SECONDS),
	durationSec: z.number().finite().min(0).max(TWO_DAYS_SECONDS),
});

const trustedOrigins = new Set(
	[env.BETTER_AUTH_URL, env.CORS_ORIGIN].map((value) => new URL(value).origin),
);

function reply(status: number, error?: string) {
	return error
		? NextResponse.json({ error }, { status })
		: new NextResponse(null, { status });
}

export async function POST(request: NextRequest) {
	// Cookies identify the user, so a request made by another site must not be
	// able to write on their behalf.
	const origin = request.headers.get("origin");
	if (origin && !trustedOrigins.has(origin)) {
		return reply(403, "Origin not allowed.");
	}

	const userId = await getAuthenticatedUserId();
	if (!userId) {
		return reply(401, "Authentication required.");
	}

	// One save every ~15 s per open player, plus pause/close: this is generous.
	const limit = checkRateLimit(`watch-progress:${userId}`, 120, 60_000);
	if (!limit.allowed) {
		return reply(429, "Too many requests.");
	}

	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) {
		return reply(413, "Payload too large.");
	}

	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return reply(400, "Invalid body.");
	}
	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return reply(400, "Invalid body.");
	}

	const saved = await saveWatchProgress(userId, parsed.data);
	return saved ? reply(204) : reply(404, "Playlist not found.");
}
