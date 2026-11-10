const DAY_MS = 24 * 60 * 60 * 1000;

/** A subscription that ends within this many days gets a warning. */
export const EXPIRY_WARNING_DAYS = 7;

export type SubscriptionTone = "ok" | "warning" | "problem";

const dateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeZone: "UTC",
});

/** Whole days left before `expiresAtMs`, or null when it has passed. */
export function daysUntilExpiry(
	expiresAtMs: number,
	nowMs: number,
): number | null {
	const left = expiresAtMs - nowMs;
	return left > 0 ? Math.floor(left / DAY_MS) : null;
}

/** True when the subscription ends within the next 7 days. */
export function isExpiringSoon(expiresAtMs: number, nowMs: number): boolean {
	const left = expiresAtMs - nowMs;
	return left > 0 && left <= EXPIRY_WARNING_DAYS * DAY_MS;
}

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
