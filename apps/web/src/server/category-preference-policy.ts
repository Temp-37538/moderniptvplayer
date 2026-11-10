export const CATEGORY_KINDS = ["channel", "movie", "series"] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export type CategoryPreferenceRow = {
	userId: string;
	playlistId: string;
	kind: string;
	categoryId: string;
	pinned: boolean;
	hidden: boolean;
};

export type CategoryScope = {
	userId: string;
	playlistId: string;
	kind: CategoryKind;
};

export type NamedCategory = {
	id: string;
	name: string;
};

export type DecoratedCategory<T> = T & {
	pinned: boolean;
};

const CATEGORY_ID_MAX = 128;

const ADULT_TOKENS = new Set([
	"adult",
	"adults",
	"adulto",
	"adultos",
	"adulti",
	"adulte",
	"adultes",
]);

const STRONG_TOKENS = new Set([
	"bangbros",
	"bdsm",
	"brazzer",
	"brazzers",
	"charme",
	"dorcel",
	"doroslych",
	"erotic",
	"erotica",
	"erotico",
	"eroticos",
	"erotik",
	"erotiek",
	"erotique",
	"erotyka",
	"erotika",
	"hardcore",
	"hentai",
	"hustler",
	"milf",
	"milfs",
	"nsfw",
	"onlyfans",
	"penthouse",
	"playboy",
	"porn",
	"porno",
	"pornos",
	"realitykings",
	"redlight",
	"redtube",
	"sexshop",
	"sexshops",
	"vivid",
	"vzroslye",
	"vzroslyh",
	"xhamster",
	"xvideos",
	"xvideo",
	"xnxx",
	"xxx",
	"xxxx",
	"yetiskin",
	"youporn",
]);

const STRONG_PREFIXES = ["xxx", "porn", "hentai", "erot", "nsfw", "onlyfan"];

const STRONG_PHRASES = ["bang bros", "naughty america", "reality kings"];

const SEX_TOKENS = new Set([
	"sex",
	"sexe",
	"sexes",
	"sexo",
	"sexy",
	"sexos",
	"sexys",
]);

const SEX_CONTEXT = new Set([
	"4k",
	"canal",
	"canais",
	"canales",
	"channel",
	"channels",
	"cine",
	"cinema",
	"fhd",
	"film",
	"films",
	"hd",
	"live",
	"movie",
	"movies",
	"sd",
	"serie",
	"series",
	"tv",
	"uhd",
	"video",
	"videos",
	"vod",
]);

const SAFE_ADULT_PHRASES = [
	"adult album alternative",
	"adult alternative",
	"adult contemporary",
	"adult hits",
	"adult standards",
	"adult swim",
	"adult top 40",
];

const AGE_MARKER =
	/(?:^|\s)(?:18\+|18 plus|\+18|plus 18|plus18|18plus|21\+|21 plus|\+21|plus 21|plus21|21plus|fsk 18|fsk18|r18)(?:\s|$)/;

export function isCategoryKind(value: string): value is CategoryKind {
	return (CATEGORY_KINDS as readonly string[]).includes(value);
}

export function categoryKindForSection(
	section: "channels" | "movies" | "series",
): CategoryKind {
	if (section === "channels") {
		return "channel";
	}
	if (section === "movies") {
		return "movie";
	}
	return "series";
}

export function parseCategoryQuery(
	value: string | null,
): { ok: true; categoryId: string | null } | { ok: false } {
	if (value == null || value.length === 0) {
		return { ok: true, categoryId: null };
	}
	if (!isValidCategoryId(value)) {
		return { ok: false };
	}
	return { ok: true, categoryId: value };
}

export function isValidCategoryId(value: string) {
	if (value.length < 1 || value.length > CATEGORY_ID_MAX) {
		return false;
	}
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code <= 32 || code === 127 || character === "/" || character === "\\") {
			return false;
		}
	}
	return true;
}

export function readCategoryIds(value: unknown): string[] {
	if (!value || typeof value !== "object") {
		return [];
	}
	const record = value as Record<string, unknown>;
	const raw = record.categoryIds ?? record.categoryId;
	const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
	const ids: string[] = [];
	for (const entry of list) {
		const id = String(entry ?? "").trim();
		if (id && !ids.includes(id)) {
			ids.push(id);
		}
	}
	return ids;
}

/**
 * Detail category ids are authoritative when they exist. An empty detail, or
 * a detail the serializer cannot read, is membership only when one catalog
 * row lists the requested category, or has no category at all and comes from
 * a category-scoped lookup. The returned ids are every real
 * category the adult lock must see. `null` denies the request.
 */
export async function provenCategoryIds(
	detail: unknown,
	requestedCategoryId: string,
	loadListing: () => Promise<unknown>,
): Promise<readonly string[] | null> {
	const detailIds = readCategoryIds(detail);
	if (detailIds.includes(requestedCategoryId)) {
		return detailIds;
	}
	if (detailIds.length > 0) {
		return null;
	}
	let listed: unknown;
	try {
		listed = await loadListing();
	} catch {
		return null;
	}
	if (!listed) {
		return null;
	}
	const listedIds = readCategoryIds(listed);
	if (listedIds.includes(requestedCategoryId)) {
		return listedIds;
	}
	// A row that names other categories is not proof for the requested one,
	// even if the lookup was scoped to it: the catalogue index returns rows
	// regardless of the category asked for. Only a row without any category
	// relies on the category-scoped lookup that found it.
	return listedIds.length === 0 ? [requestedCategoryId] : null;
}

/**
 * Whether a film or show page may open from the category in its URL. A
 * restricted account (a hidden category or the adult lock) needs proof that
 * the title is really listed there, and the adult lock then sees every real
 * category. Otherwise nothing can be bypassed, so the plain check applies.
 */
export async function itemOpenAllowed(input: {
	restricted: boolean;
	item: unknown;
	categoryId: string;
	loadListing: () => Promise<unknown>;
	isAvailable: (
		categoryIds: readonly string[],
		requiredIds: readonly string[],
	) => Promise<boolean>;
}): Promise<boolean> {
	const { restricted, item, categoryId } = input;
	const categoryIds = restricted
		? await provenCategoryIds(item, categoryId, input.loadListing)
		: [categoryId, ...readCategoryIds(item).filter((id) => id !== categoryId)];
	if (!categoryIds) {
		return false;
	}
	return input.isAvailable(categoryIds, [categoryId]);
}

/** What membership needs from one catalog row: its id and its categories. */
export type MembershipRow = { id: string; categoryIds: string[] };

export function toMembershipRows(items: unknown): MembershipRow[] {
	if (!Array.isArray(items)) {
		return [];
	}
	const rows: MembershipRow[] = [];
	for (const item of items) {
		if (!item || typeof item !== "object") {
			continue;
		}
		const id = String((item as { id?: unknown }).id ?? "").trim();
		if (id) {
			rows.push({ id, categoryIds: readCategoryIds(item) });
		}
	}
	return rows;
}

export function findMembershipRow(
	rows: readonly MembershipRow[],
	itemId: string,
): MembershipRow | null {
	return rows.find((row) => row.id === itemId) ?? null;
}

/**
 * The catalogue index is not scoped to a category, so its row proves
 * membership only when it lists the requested category. Otherwise (no row,
 * another category, or an unreadable index) the provider listing of the
 * requested category stays the authority.
 */
export async function resolveMembershipRow(input: {
	categoryId: string;
	readIndexed: () => Promise<MembershipRow | null>;
	readListing: () => Promise<MembershipRow | null>;
}): Promise<MembershipRow | null> {
	let indexed: MembershipRow | null = null;
	try {
		indexed = await input.readIndexed();
	} catch {
		// A missing or unavailable index falls back to the provider listing.
	}
	if (indexed?.categoryIds.includes(input.categoryId)) {
		return indexed;
	}
	return input.readListing();
}

export function readEpisodeIds(value: unknown): string[] {
	if (!value || typeof value !== "object" || !("seasons" in value)) {
		return [];
	}
	const seasons = (value as { seasons?: unknown }).seasons;
	if (!Array.isArray(seasons)) {
		return [];
	}
	const ids: string[] = [];
	for (const season of seasons) {
		if (!season || typeof season !== "object" || !("episodes" in season)) {
			continue;
		}
		const episodes = (season as { episodes?: unknown }).episodes;
		if (!Array.isArray(episodes)) {
			continue;
		}
		for (const episode of episodes) {
			if (!episode || typeof episode !== "object" || !("id" in episode)) {
				continue;
			}
			const id = String((episode as { id?: unknown }).id ?? "").trim();
			if (id && !ids.includes(id)) {
				ids.push(id);
			}
		}
	}
	return ids;
}

export function preferenceScopeWhere(scope: CategoryScope) {
	return {
		userId: scope.userId,
		playlistId: scope.playlistId,
		kind: scope.kind,
	};
}

export function matchesPreferenceScope(
	row: Pick<CategoryPreferenceRow, "userId" | "playlistId" | "kind">,
	scope: CategoryScope,
) {
	const where = preferenceScopeWhere(scope);
	return (
		row.userId === where.userId &&
		row.playlistId === where.playlistId &&
		row.kind === where.kind
	);
}

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

export function normalizeCategoryName(name: string) {
	const folded = name
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(
			/[æðđıłøœßþ]/g,
			(letter) => NON_DECOMPOSING_LETTERS[letter] ?? letter,
		);
	return folded
		.replace(/[+＋]/g, "+")
		.replace(/[^a-z0-9+]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function containsPhrase(normalized: string, phrase: string) {
	return ` ${normalized} `.includes(` ${phrase} `);
}

function isStrongToken(token: string) {
	if (STRONG_TOKENS.has(token)) {
		return true;
	}
	return STRONG_PREFIXES.some((prefix) => token.startsWith(prefix));
}

function hasAgeMarker(normalized: string) {
	if (AGE_MARKER.test(normalized)) {
		return true;
	}
	return normalized
		.split(" ")
		.some((token) => /(?:18\+|21\+|\+18|\+21|fsk18|r18)/.test(token));
}

/**
 * A lone "x" is the French and Spanish adult label only next to a media word
 * ("Films X", "Canal X", "X Movies", "Films X HD"). Both neighbours must be
 * media words or absent, so "X-Men", "Movies X-Men", "Formula X TV" and a
 * bare "X" stay allowed.
 */
function hasXMarker(tokens: string[]) {
	return tokens.some((token, index) => {
		if (token !== "x" || tokens.length === 1) {
			return false;
		}
		const previous = tokens[index - 1];
		const next = tokens[index + 1];
		return (
			(previous === undefined || SEX_CONTEXT.has(previous)) &&
			(next === undefined || SEX_CONTEXT.has(next))
		);
	});
}

function hasSexMarker(tokens: string[]) {
	if (!tokens.some((token) => SEX_TOKENS.has(token))) {
		return false;
	}
	if (tokens.length === 1) {
		return true;
	}
	return tokens.some((token) => SEX_CONTEXT.has(token));
}

/**
 * High-precision category-name check. Ordinary titles, music formats such as
 * Adult Contemporary, and the Adult Swim brand stay unclassified.
 */
export function isAdultCategoryName(name: string) {
	const normalized = normalizeCategoryName(name);
	if (!normalized) {
		return false;
	}
	const tokens = normalized.split(" ");
	if (
		hasAgeMarker(normalized) ||
		tokens.some(isStrongToken) ||
		STRONG_PHRASES.some((phrase) => containsPhrase(normalized, phrase)) ||
		hasSexMarker(tokens) ||
		hasXMarker(tokens)
	) {
		return true;
	}
	const adultNamed = tokens.some((token) => ADULT_TOKENS.has(token));
	if (!adultNamed) {
		return false;
	}
	const safePhrase = SAFE_ADULT_PHRASES.some((phrase) =>
		containsPhrase(normalized, phrase),
	);
	return !safePhrase;
}

/**
 * Hidden categories block only ids the caller marked required, which is the
 * category the user asked to open. The adult lock blocks any id whose name
 * classifies as adult, including extra memberships on the same title. A
 * missing name fails closed only for a required id.
 */
export function isCategorySetBlocked(input: {
	categoryIds: readonly string[];
	namesById: ReadonlyMap<string, string>;
	hiddenIds: ReadonlySet<string>;
	lockAdultCategories: boolean;
	requiredIds?: ReadonlySet<string>;
}) {
	const requiredIds = input.requiredIds;
	for (const categoryId of input.categoryIds) {
		if (requiredIds?.has(categoryId) && input.hiddenIds.has(categoryId)) {
			return true;
		}
		if (!input.lockAdultCategories) {
			continue;
		}
		const name = input.namesById.get(categoryId);
		if (name === undefined) {
			if (requiredIds?.has(categoryId)) {
				return true;
			}
			continue;
		}
		if (isAdultCategoryName(name)) {
			return true;
		}
	}
	return false;
}

/**
 * True when a title can stay visible from `requestedCategoryId`. Hidden
 * applies only to that requested id. Adult names apply to every id supplied.
 */
export function isItemOpenFromCategory(input: {
	requestedCategoryId: string;
	itemCategoryIds: readonly string[];
	namesById: ReadonlyMap<string, string>;
	hiddenIds: ReadonlySet<string>;
	lockAdultCategories: boolean;
}) {
	const categoryIds = [input.requestedCategoryId];
	for (const categoryId of input.itemCategoryIds) {
		if (categoryId && categoryId !== input.requestedCategoryId) {
			categoryIds.push(categoryId);
		}
	}
	return !isCategorySetBlocked({
		categoryIds,
		namesById: input.namesById,
		hiddenIds: input.hiddenIds,
		lockAdultCategories: input.lockAdultCategories,
		requiredIds: new Set([input.requestedCategoryId]),
	});
}

const SAVED_ITEM_URL =
	/^\/dashboard\/(channels|movies|series)\/([^/]+)\/([^/]+)\/([^/#?]+)/;

const SECTION_KIND = {
	channels: "channel",
	movies: "movie",
	series: "series",
} as const;

export type SavedItemTarget = {
	playlistId: string;
	kind: CategoryKind;
	categoryId: string;
	itemId: string;
};

function decodePathSegment(value: string): string | null {
	let decoded: string;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		return null;
	}
	if (!isValidCategoryId(decoded) || decoded.includes("..")) {
		return null;
	}
	return decoded;
}

/** Playlist, kind, and category stored in a dashboard item link. */
export function categoryTargetFromItemUrl(
	itemUrl: string,
): SavedItemTarget | null {
	const match = SAVED_ITEM_URL.exec(itemUrl);
	if (!match) {
		return null;
	}
	const section = match[1];
	if (section !== "channels" && section !== "movies" && section !== "series") {
		return null;
	}
	const playlistId = decodePathSegment(match[2] ?? "");
	const categoryId = decodePathSegment(match[3] ?? "");
	const itemId = decodePathSegment(match[4] ?? "");
	if (!playlistId || !categoryId || !itemId) {
		return null;
	}
	return {
		playlistId,
		kind: SECTION_KIND[section],
		categoryId,
		itemId,
	};
}

export function unscopedPlaybackAllowed(input: {
	lockAdultCategories: boolean;
	hasHiddenCategory: boolean;
}) {
	return !input.lockAdultCategories && !input.hasHiddenCategory;
}

export function partitionCategories<T extends NamedCategory>(
	categories: readonly T[],
	rows: readonly CategoryPreferenceRow[],
	scope: CategoryScope,
	lockAdultCategories: boolean,
): {
	visible: DecoratedCategory<T>[];
	hidden: DecoratedCategory<T>[];
	lockedAdultIds: string[];
} {
	const scopedRows = rows.filter((row) => matchesPreferenceScope(row, scope));
	const byId = new Map(scopedRows.map((row) => [row.categoryId, row]));
	const order = new Map(
		categories.map((category, index) => [category.id, index]),
	);
	const visible: DecoratedCategory<T>[] = [];
	const hidden: DecoratedCategory<T>[] = [];
	const lockedAdultIds: string[] = [];

	for (const category of categories) {
		const preference = byId.get(category.id);
		const pinned = Boolean(preference?.pinned);
		if (lockAdultCategories && isAdultCategoryName(category.name)) {
			lockedAdultIds.push(category.id);
			continue;
		}
		const decorated = { ...category, pinned };
		if (preference?.hidden) {
			hidden.push(decorated);
			continue;
		}
		visible.push(decorated);
	}

	visible.sort((left, right) => {
		if (left.pinned !== right.pinned) {
			return left.pinned ? -1 : 1;
		}
		return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
	});

	return { visible, hidden, lockedAdultIds };
}
