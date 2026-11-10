/** One page of a catalog category, with the size of the whole category. */
export type CatalogPage<T> = { items: T[]; total: number };

/** Bounds of one catalog page. Invalid input falls back to page 1 of 20. */
export function pageWindow(page: number, limit: number) {
	const size = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
	const index = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	const start = (index - 1) * size;
	return { start, end: start + size };
}

/** Cut one page out of a whole category and keep its size. */
export function slicePage<T>(
	rows: readonly T[],
	page: number,
	limit: number,
): CatalogPage<T> {
	const { start, end } = pageWindow(page, limit);
	return { items: rows.slice(start, end), total: rows.length };
}

/** Number of pages for `total` rows, at least 1 so "Page 1 of 1" reads. */
export function pageCount(total: number, limit: number) {
	if (!Number.isFinite(total) || total <= 0 || limit <= 0) {
		return 1;
	}
	return Math.ceil(total / limit);
}

/**
 * The `?page=` search param as a page number: 1 when absent, null when it is
 * not a plain whole number of at least 1 (`0`, `-1`, `1.5`, `abc`, empty).
 * A repeated param reads its first value.
 */
export function parsePageParam(
	raw: string | string[] | undefined,
): number | null {
	if (raw === undefined) {
		return 1;
	}
	const value = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
	if (!/^\d+$/.test(value)) {
		return null;
	}
	const page = Number(value);
	return Number.isSafeInteger(page) && page >= 1 ? page : null;
}

/**
 * The page a request should be redirected to, or null when it can stay:
 * malformed or repeated params go to page 1, pages past the end go to the
 * last page.
 */
export function pageRedirectTarget(
	raw: string | string[] | undefined,
	totalPages: number,
): number | null {
	const requested = parsePageParam(raw);
	if (requested === null) {
		return 1;
	}
	if (requested > totalPages) {
		return Math.max(1, totalPages);
	}
	return Array.isArray(raw) ? requested : null;
}
