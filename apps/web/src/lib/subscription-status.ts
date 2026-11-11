const DAY_MS = 24 * 60 * 60 * 1000;

/** A subscription that ends within this many days gets a warning. */
export const EXPIRY_WARNING_DAYS = 7;

export type SubscriptionTone = "ok" | "warning" | "problem";

const dateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeZone: "UTC",
});

/** Midnight UTC of the day `ms` falls on; dates are shown in UTC too. */
function utcDay(ms: number): number {
	const d = new Date(ms);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Calendar days left before `expiresAtMs` (0 is today, 1 tomorrow), or null
 * when it has passed. Counting days, not 24 h blocks, keeps the text in step
 * with the date shown next to it.
 */
export function daysUntilExpiry(
	expiresAtMs: number,
	nowMs: number,
): number | null {
	if (expiresAtMs <= nowMs) {
		return null;
	}
	return Math.round((utcDay(expiresAtMs) - utcDay(nowMs)) / DAY_MS);
}

/** True when the subscription ends within the next 7 calendar days. */
export function isExpiringSoon(expiresAtMs: number, nowMs: number): boolean {
	const days = daysUntilExpiry(expiresAtMs, nowMs);
	return days !== null && days <= EXPIRY_WARNING_DAYS;
}

/** Account states from the provider that block playback. */
const BLOCKED_STATUSES = new Set([
	"banned",
	"disabled",
	"inactive",
	"suspended",
]);

function expiresInText(days: number) {
	if (days === 0) {
		return "Expires today";
	}
	if (days === 1) {
		return "Expires tomorrow";
	}
	return `Expires in ${days} days`;
}

/**
 * Short status line for a playlist subscription. `expDate` is in seconds, as
 * sent by Xtream servers.
 */
export function describeSubscription(
	status: { status: string; expDate: number | null },
	nowMs: number,
): { tone: SubscriptionTone; text: string } {
	const label = status.status || "Unknown";
	const lower = label.toLowerCase();
	const expiresAtMs = status.expDate ? status.expDate * 1000 : null;
	const expiry =
		expiresAtMs !== null ? dateFormatter.format(new Date(expiresAtMs)) : null;

	if (BLOCKED_STATUSES.has(lower)) {
		return { tone: "problem", text: `Account ${lower}` };
	}
	if (lower === "expired" || (expiresAtMs !== null && expiresAtMs <= nowMs)) {
		return { tone: "problem", text: expiry ? `Expired ${expiry}` : "Expired" };
	}
	if (expiresAtMs !== null && isExpiringSoon(expiresAtMs, nowMs)) {
		const days = daysUntilExpiry(expiresAtMs, nowMs) ?? 0;
		return { tone: "warning", text: expiresInText(days) };
	}
	if (lower === "active") {
		return { tone: "ok", text: expiry ? `Expires ${expiry}` : "Active" };
	}
	return { tone: "ok", text: expiry ? `${label} until ${expiry}` : label };
}
