// The global search keeps its text and filter in the address, so Back from a
// result and a reload show the same search again.

export const SEARCH_KINDS = ["all", "channel", "movie", "series"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export function parseSearchKind(value: string | null | undefined): SearchKind {
	return SEARCH_KINDS.find((kind) => kind === value) ?? "all";
}

/**
 * The query string for a search, other parameters kept. The defaults (no
 * text, "all") are left out so a fresh search page keeps a clean address.
 */
export function searchQueryString(
	current: string,
	{ q, kind }: { q: string; kind: SearchKind },
): string {
	const params = new URLSearchParams(current);
	if (q.trim()) {
		params.set("q", q);
	} else {
		params.delete("q");
	}
	if (kind === "all") {
		params.delete("kind");
	} else {
		params.set("kind", kind);
	}
	const value = params.toString();
	return value ? `?${value}` : "";
}
