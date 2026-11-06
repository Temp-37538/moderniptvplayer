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
	"bdsm",
	"brazzers",
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
	"milf",
	"milfs",
	"nsfw",
	"onlyfans",
	"porn",
	"porno",
	"pornos",
	"redtube",
	"sexshop",
	"sexshops",
	"vzroslye",
	"vzroslyh",
	"xvideos",
	"xvideo",
	"xnxx",
	"xxx",
	"xxxx",
	"yetiskin",
	"youporn",
]);

const STRONG_PREFIXES = ["xxx", "porn", "hentai", "erot", "nsfw", "onlyfan"];

const SEX_TOKENS = new Set(["sex", "sexo", "sexy", "sexos", "sexys"]);

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
		hasSexMarker(tokens)
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

export function isCategorySetBlocked(input: {
	categoryIds: readonly string[];
	namesById: ReadonlyMap<string, string>;
	hiddenIds: ReadonlySet<string>;
	lockAdultCategories: boolean;
	requiredIds?: ReadonlySet<string>;
}) {
	for (const categoryId of input.categoryIds) {
		if (input.hiddenIds.has(categoryId)) {
			return true;
		}
		if (!input.lockAdultCategories) {
			continue;
		}
		const name = input.namesById.get(categoryId);
		if (name === undefined) {
			if (input.requiredIds?.has(categoryId)) {
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
