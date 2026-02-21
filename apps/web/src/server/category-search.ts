type SearchReason = "limit_reached" | "timeout" | "max_pages" | "exhausted";

type SearchMeta = {
	scannedPages: number;
	elapsedMs: number;
	hasMore: boolean;
	reason: SearchReason;
};

export type SearchListItem = {
	id: string;
	name: string;
	categoryId: string;
	score: number;
	poster?: string;
	logo?: string;
};

type SearchItemInput = Omit<SearchListItem, "score">;

type SearchPageLoader<T> = (options: {
	page: number;
	limit: number;
}) => Promise<T[]>;

type SearchInCategoryOptions<T> = {
	query: string;
	limit: number;
	maxPages: number;
	timeoutMs?: number;
	loadPage: SearchPageLoader<T>;
	toSearchItem: (item: T) => SearchItemInput | null;
};

const PAGE_SIZE = 20;
const DEFAULT_TIMEOUT_MS = 8000;

function normalizeText(value: unknown) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function computeScore(name: string, normalizedQuery: string) {
	const normalizedName = normalizeText(name);
	if (!normalizedName || !normalizedQuery) {
		return 0;
	}

	if (normalizedName === normalizedQuery) {
		return 1200;
	}

	if (normalizedName.startsWith(normalizedQuery)) {
		return 1000 - Math.min(normalizedName.length, 200);
	}

	const tokenScore = normalizedName
		.split(/\s+/)
		.some((token) => token.startsWith(normalizedQuery))
		? 800
		: 0;

	const index = normalizedName.indexOf(normalizedQuery);
	const includesScore = index >= 0 ? 700 - Math.min(index, 300) : 0;

	return Math.max(tokenScore, includesScore);
}

export async function searchInCategory<T>({
	query,
	limit,
	maxPages,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	loadPage,
	toSearchItem,
}: SearchInCategoryOptions<T>) {
	const startedAt = Date.now();
	const normalizedQuery = normalizeText(query);
	const deduped = new Map<string, SearchListItem>();

	let scannedPages = 0;
	let hasMore = false;
	let reason: SearchReason = "max_pages";

	for (let page = 1; page <= maxPages; page += 1) {
		if (Date.now() - startedAt >= timeoutMs) {
			reason = "timeout";
			hasMore = true;
			break;
		}

		const pageItems = await loadPage({ page, limit: PAGE_SIZE });
		scannedPages += 1;

		if (pageItems.length === 0) {
			reason = "exhausted";
			hasMore = false;
			break;
		}

		for (const item of pageItems) {
			const mapped = toSearchItem(item);
			if (!mapped || !mapped.id || !mapped.name || !mapped.categoryId) {
				continue;
			}

			const score = computeScore(mapped.name, normalizedQuery);
			if (score <= 0) {
				continue;
			}

			const existing = deduped.get(mapped.id);
			if (!existing || score > existing.score) {
				deduped.set(mapped.id, {
					...mapped,
					score,
				});
			}
		}

		const exhaustedPage = pageItems.length < PAGE_SIZE;
		if (deduped.size >= limit) {
			reason = "limit_reached";
			hasMore = !exhaustedPage || page < maxPages;
			break;
		}

		if (exhaustedPage) {
			reason = "exhausted";
			hasMore = false;
			break;
		}

		if (page === maxPages) {
			reason = "max_pages";
			hasMore = true;
		}
	}

	const items = Array.from(deduped.values())
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			return a.name.localeCompare(b.name);
		})
		.slice(0, limit);

	const meta: SearchMeta = {
		scannedPages,
		elapsedMs: Date.now() - startedAt,
		hasMore,
		reason,
	};

	return { items, meta };
}
