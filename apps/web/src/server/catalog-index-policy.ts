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
// The sync runs through after() inside the /api/search invocation, so the
// route's maxDuration (300 s, the Vercel Hobby maximum with fluid compute) is
// a hard kill. The sync gives up well before it, so it can still record its
// failure and release its lock. The lock outlives the invocation, otherwise a
// second sync could start while the first one is still writing, but only by a
// small margin, so the lock of a killed sync does not block the next one for
// long. The search box polls for SYNC_LOCK_MS (SEARCH_POLL_WINDOW_MS in
// global-search.tsx).
export const SYNC_FUNCTION_MAX_MS = 300_000;
export const SYNC_TIMEOUT_MS = 240_000;
export const SYNC_LOCK_MS = SYNC_FUNCTION_MAX_MS + 30_000;
export const SYNC_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
// An explicit retry from the user skips the cooldown above, but still waits
// this long after the last attempt, so repeated clicks cannot hammer the
// provider with full catalogue listings.
export const SYNC_MANUAL_RETRY_MIN_MS = 30_000;
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
	items: readonly unknown[],
	/** Pass one set per kind to deduplicate across chunks of a listing. */
	seenIds: Set<string> = new Set<string>(),
): CatalogRowInput[] {
	const rows: CatalogRowInput[] = [];

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

/** "retry" is an explicit retry from the user, "auto" any other search. */
export type SyncTrigger = "auto" | "retry";

/**
 * Time left before a failed sync may be retried, 0 when nothing waits. The
 * running sync's lock is not a cooldown: `decideSync` and the lock in
 * `syncCatalog` still keep two syncs from running at once.
 */
export function syncRetryDelayMs(
	state: CatalogSyncPolicyState | null,
	now: Date,
	trigger: SyncTrigger = "auto",
): number {
	if (state?.status !== "failed" || state.lastAttemptAt === null) {
		return 0;
	}
	const elapsed = now.getTime() - state.lastAttemptAt.getTime();
	if (elapsed < 0) {
		return 0;
	}
	const cooldown =
		trigger === "retry" ? SYNC_MANUAL_RETRY_MIN_MS : SYNC_RETRY_COOLDOWN_MS;
	return Math.max(0, cooldown - elapsed);
}

export function decideSync(
	state: CatalogSyncPolicyState | null,
	now: Date,
	trigger: SyncTrigger = "auto",
): SyncDecision {
	if (!state) {
		return "build";
	}

	const nowMs = now.getTime();
	const locked =
		state.status === "syncing" &&
		state.lockedUntil !== null &&
		state.lockedUntil.getTime() > nowMs;
	const recentFailure = syncRetryDelayMs(state, now, trigger) > 0;

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

/**
 * One kind's search query. Visibility and ranking run in SQL, before the
 * LIMIT, so hidden or adult titles can no longer push visible ones out of the
 * candidates, and the best matches come first instead of the first names in
 * alphabetical order. The rank mirrors `rankMatch`: exact name, name starting
 * with the query, a word starting with the first token, then the rest; ties
 * go to the shorter name, then the name. Every value is a parameter.
 *
 * - Hidden: a title is dropped when all its categories are hidden. A title
 *   without categories is dropped too, as `pickOpenCategory` does.
 * - Adult: a title is dropped when any category is adult-locked.
 */
export function buildCatalogSearchQuery(input: {
	playlistId: string;
	activeSyncId: string;
	kind: CatalogKind;
	tokens: readonly string[];
	hiddenIds: ReadonlySet<string>;
	adultIds: ReadonlySet<string>;
	limit: number;
}): { sql: string; params: unknown[] } {
	const joined = input.tokens.join(" ");
	const firstToken = input.tokens[0] ?? "";
	const params: unknown[] = [
		input.playlistId,
		input.activeSyncId,
		input.kind,
		JSON.stringify([...input.hiddenIds]),
		JSON.stringify([...input.adultIds]),
		joined,
		firstToken,
		input.limit,
	];
	const tokenClauses = input.tokens.map((token) => {
		params.push(token);
		return `strpos("normalizedName", $${params.length}) > 0`;
	});
	const sql = `SELECT "itemId", "name", "normalizedName", "categoryIds", "image"
		FROM "catalog_entry"
		WHERE "playlistId" = $1 AND "syncId" = $2 AND "kind" = $3
		  AND ${tokenClauses.join(" AND ")}
		  AND NOT ("categoryIds" <@ ARRAY(SELECT jsonb_array_elements_text($4::jsonb)))
		  AND NOT ("categoryIds" && ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
		ORDER BY
		  CASE
		    WHEN "normalizedName" = $6 THEN 0
		    WHEN starts_with("normalizedName", $6) THEN 1
		    WHEN starts_with("normalizedName", $7)
		      OR strpos("normalizedName", ' ' || $7) > 0 THEN 2
		    ELSE 3
		  END,
		  length("normalizedName"),
		  "normalizedName"
		LIMIT $8`;
	return { sql, params };
}
