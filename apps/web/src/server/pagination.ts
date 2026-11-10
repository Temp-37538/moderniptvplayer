/**
 * Bounds of one catalog page, plus `lookahead` extra rows. Fetching one row
 * past the page tells whether a next page exists without counting the
 * category.
 */
export function pageWindow(page: number, limit: number, lookahead = 0) {
	const size = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
	const index = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	const extra =
		Number.isFinite(lookahead) && lookahead > 0 ? Math.floor(lookahead) : 0;
	const start = (index - 1) * size;
	return { start, end: start + size + extra };
}

/**
 * Split rows fetched with a lookahead into the page itself and whether more
 * rows follow. Run it on the raw rows, before any visibility filter, so a
 * filtered row never hides the next page.
 */
export function splitPage<T>(rows: readonly T[], limit: number) {
	return {
		items: rows.slice(0, limit),
		hasNextPage: rows.length > limit,
	};
}
