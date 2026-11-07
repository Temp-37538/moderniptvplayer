export function withStreamCategory(
	src: string,
	categoryId: string,
	extra?: { showId?: string },
) {
	const url = new URL(src, "http://local");
	url.searchParams.set("category", categoryId);
	if (extra?.showId) {
		url.searchParams.set("show", extra.showId);
	}
	return `${url.pathname}${url.search}`;
}
