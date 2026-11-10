import {
	isValidCategoryId,
	readCategoryIds,
} from "./category-preference-policy.ts";

export const CATALOG_KINDS = ["channel", "movie", "series"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const CATALOG_MAX_ROWS = 300_000;
export const CATALOG_NAME_MAX = 300;
export const CATALOG_IMAGE_MAX = 2048;
export const CATALOG_INSERT_BATCH = 2_000;
export const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
// A sync gives up after SYNC_TIMEOUT_MS. The lock must outlive it, otherwise
// a second sync could start while the first one is still writing. The search
// box polls for the same window (SEARCH_POLL_WINDOW_MS in global-search.tsx).
export const SYNC_TIMEOUT_MS = 300_000;
export const SYNC_LOCK_MS = 360_000;
export const SYNC_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
export const SEARCH_QUERY_MIN = 2;
export const SEARCH_QUERY_MAX = 64;
export const SEARCH_MAX_TOKENS = 6;
export const SEARCH_CANDIDATES_PER_KIND = 300;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 30;

export type CatalogRowInput = {
	kind: CatalogKind;
	itemId: string;
	name: string;
	normalizedName: string;
	categoryIds: string[];
	image: string | null;
};

const NON_DECOMPOSING_LETTERS: Record<string, string> = {
	æ: "ae",
	ð: "d",
	đ: "d",
	ı: "i",
	ł: "l",
	ø: "o",
	œ: "oe",
	ß: "ss",
	þ: "th",
};

const ID_PATTERN = /^[\w-]{1,64}$/;
const IMAGE_URL_PATTERN = /^https?:\/\//i;

export function normalizeSearchText(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(
			/[æðđıłøœßþ]/g,
			(letter) => NON_DECOMPOSING_LETTERS[letter] ?? letter,
		)
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()
		.replace(/\s+/g, " ");
}

export function parseSearchTokens(q: string): string[] | null {
	const trimmed = q.trim();
	if (trimmed.length > SEARCH_QUERY_MAX) {
		return null;
	}
	const normalized = normalizeSearchText(trimmed);
	if (normalized.length < SEARCH_QUERY_MIN) {
		return null;
	}
	const tokens = [...new Set(normalized.split(" ").filter(Boolean))].slice(
		0,
		SEARCH_MAX_TOKENS,
	);
	return tokens.length > 0 ? tokens : null;
}

function safeImage(value: string): string | null {
	if (value.length > CATALOG_IMAGE_MAX || !IMAGE_URL_PATTERN.test(value)) {
		return null;
	}
	try {
		const parsed = new URL(value);
		if (
			(parsed.protocol === "http:" || parsed.protocol === "https:") &&
			parsed.hostname
		) {
			return value;
		}
	} catch {
		// Invalid image URLs are not stored.
	}
	return null;
}

/**
 * Explicit allowlist: provider stream URLs and all other provider fields are
 * deliberately never read or copied into persistent catalogue rows.
 */
export function toCatalogRows(
	kind: CatalogKind,
	items: unknown[],
): CatalogRowInput[] {
	const rows: CatalogRowInput[] = [];
	const seenIds = new Set<string>();

	for (const item of items) {
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			continue;
		}

		const record = item as Record<string, unknown>;
		const itemId = String(record.id ?? "").trim();
		if (!ID_PATTERN.test(itemId) || seenIds.has(itemId)) {
			continue;
		}

		const name = String(record.name ?? "")
			.trim()
			.slice(0, CATALOG_NAME_MAX);
		if (!name) {
			continue;
		}
		const normalizedName = normalizeSearchText(name);
		if (!normalizedName) {
			continue;
		}

		const categoryIds = readCategoryIds(record).filter(isValidCategoryId);
		if (categoryIds.length === 0) {
			continue;
		}

		const imageValue = [record.poster, record.logo]
			.map((value) => String(value ?? "").trim())
			.find(Boolean);
		const image = imageValue ? safeImage(imageValue) : null;

		seenIds.add(itemId);
		rows.push({
			kind,
			itemId,
			name,
			normalizedName,
			categoryIds,
			image,
		});
	}

	return rows;
}

export function pickOpenCategory(input: {
	categoryIds: readonly string[];
	hiddenIds: ReadonlySet<string>;
	adultIds: ReadonlySet<string>;
}): string | null {
	if (input.categoryIds.some((id) => input.adultIds.has(id))) {
		return null;
	}
	return input.categoryIds.find((id) => !input.hiddenIds.has(id)) ?? null;
}

export function rankMatch(
	normalizedName: string,
	tokens: readonly string[],
): number | null {
	if (
		tokens.length === 0 ||
		!tokens.every((token) => normalizedName.includes(token))
	) {
		return null;
	}
	const joined = tokens.join(" ");
	if (normalizedName === joined) {
		return 0;
	}
	if (normalizedName.startsWith(joined)) {
		return 1;
	}
	const firstToken = tokens[0];
	if (
		firstToken &&
		normalizedName.split(" ").some((word) => word.startsWith(firstToken))
	) {
		return 2;
	}
	return 3;
}

const SECTION_BY_KIND: Record<CatalogKind, string> = {
	channel: "channels",
	movie: "movies",
	series: "series",
};

export function searchHref(
	kind: CatalogKind,
	playlistId: string,
	categoryId: string,
	itemId: string,
): string {
	return [
		"",
		"dashboard",
		SECTION_BY_KIND[kind],
		playlistId,
		categoryId,
		itemId,
	]
		.map((segment, index) =>
			index === 0 ? segment : encodeURIComponent(segment),
		)
		.join("/");
}

export type CatalogSyncPolicyState = {
	status: string;
	activeSyncId: string | null;
	syncedAt: Date | null;
	lockedUntil: Date | null;
	lastAttemptAt: Date | null;
};

export type SyncDecision =
	| "serve"
	| "serve-and-refresh"
	| "build"
	| "unavailable";

export function decideSync(
	state: CatalogSyncPolicyState | null,
	now: Date,
): SyncDecision {
	if (!state) {
		return "build";
	}

	const nowMs = now.getTime();
	const locked =
		state.status === "syncing" &&
		state.lockedUntil !== null &&
		state.lockedUntil.getTime() > nowMs;
	const recentFailure =
		state.status === "failed" &&
		state.lastAttemptAt !== null &&
		nowMs - state.lastAttemptAt.getTime() >= 0 &&
		nowMs - state.lastAttemptAt.getTime() < SYNC_RETRY_COOLDOWN_MS;

	if (!state.activeSyncId) {
		if (locked) {
			return "build";
		}
		return recentFailure ? "unavailable" : "build";
	}

	const fresh =
		state.syncedAt !== null &&
		nowMs - state.syncedAt.getTime() < CATALOG_TTL_MS;
	if (fresh) {
		return "serve";
	}
	if (locked || recentFailure) {
		return "serve";
	}
	return "serve-and-refresh";
}
