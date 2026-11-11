export type Crumb = {
	href: string;
	label: string;
	/** False when the href has no page of its own, so it renders as text. */
	link: boolean;
};

type PlaylistRef = { id: string; playlistName: string };

/** Sections whose `/dashboard/<section>` route has a page. */
const SECTION_LABELS: Record<string, string> = {
	channels: "Channels",
	movies: "Movies",
	series: "Series",
	watchlater: "Watch Later",
	favorites: "Favorites",
	search: "Search",
	addplaylist: "Add playlist",
	settings: "Settings",
};

/** Sections without an index page: their crumb is plain text. */
const SECTIONS_WITHOUT_PAGE = new Set(["settings"]);

/** Sections followed by a playlist id. */
const PLAYLIST_SECTIONS = new Set([
	"channels",
	"movies",
	"series",
	"watchlater",
	"favorites",
	"search",
]);

/** Sections with a `/<section>/search/<playlistId>` branch. */
const SEARCHABLE_SECTIONS = new Set(["channels", "movies", "series"]);

const FIXED_CHILD_LABELS: Record<string, Record<string, string>> = {
	addplaylist: { xtream: "Xtream Codes", m3u: "M3U URL" },
	settings: { account: "Account", security: "Security" },
};

/**
 * Turn a dashboard pathname into breadcrumbs. Ids are never shown: a playlist
 * id becomes its name, and any other id only appears when the page registered
 * a label for that href. Unknown segments are left out.
 */
export function buildBreadcrumbs(
	pathname: string,
	playlists: readonly PlaylistRef[],
	labels: Readonly<Record<string, string>> = {},
): Crumb[] {
	const parts = pathname.split("/").filter(Boolean);
	if (parts[0] !== "dashboard") {
		return [];
	}

	const hrefAt = (index: number) => `/${parts.slice(0, index + 1).join("/")}`;
	const playlistName = (id: string | undefined) =>
		id ? playlists.find((playlist) => playlist.id === id)?.playlistName : "";

	const crumbs: Crumb[] = [{ href: "/dashboard", label: "Home", link: true }];
	const section = parts[1];
	if (!section) {
		return crumbs;
	}

	const sectionLabel = SECTION_LABELS[section];
	if (!sectionLabel) {
		// `/dashboard/<playlistId>` is the playlist overview.
		const name = playlistName(section);
		if (name && parts.length === 2) {
			crumbs.push({ href: hrefAt(1), label: name, link: true });
		}
		return crumbs;
	}

	crumbs.push({
		href: hrefAt(1),
		label: sectionLabel,
		link: !SECTIONS_WITHOUT_PAGE.has(section),
	});

	let index = 2;
	const fixedChild = FIXED_CHILD_LABELS[section]?.[parts[2] ?? ""];
	if (fixedChild) {
		crumbs.push({ href: hrefAt(2), label: fixedChild, link: true });
		return crumbs;
	}
	if (!PLAYLIST_SECTIONS.has(section)) {
		return crumbs;
	}

	// `/<section>/search/<playlistId>[/<categoryId>]` reads as the browse path
	// it searches in, with "Search" last: Movies > My TV > Drama > Search.
	const isSearch = SEARCHABLE_SECTIONS.has(section) && parts[2] === "search";
	if (isSearch) {
		index = 3;
	}
	const browseHref = (at: number) =>
		isSearch
			? `/${[...parts.slice(0, 2), ...parts.slice(3, at + 1)].join("/")}`
			: hrefAt(at);

	const name = playlistName(parts[index]);
	if (!name) {
		return crumbs;
	}
	crumbs.push({ href: browseHref(index), label: name, link: true });

	for (let next = index + 1; next < parts.length; next += 1) {
		const label = labels[hrefAt(next)] ?? labels[browseHref(next)];
		if (label) {
			crumbs.push({ href: browseHref(next), label, link: true });
		}
	}

	if (isSearch) {
		crumbs.push({
			href: hrefAt(parts.length - 1),
			label: "Search",
			link: true,
		});
	}

	return crumbs;
}
