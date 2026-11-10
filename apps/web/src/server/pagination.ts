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
