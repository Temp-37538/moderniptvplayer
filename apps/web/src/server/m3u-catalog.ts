import "server-only";
import type {
	StandardXtreamCategory,
	StandardXtreamChannel,
	StandardXtreamMovie,
	StandardXtreamMovieListing,
	StandardXtreamShow,
} from "@iptv/xtream-api/standardized";
import { env } from "@moderniptvplayer/env/server";
import {
	categoriesFor,
	findM3uStream,
	type M3uKind,
	M3uPlaylistError,
	M3U_HTTP_884_REFUSAL,
	M3U_MAX_BYTES,
	type ParsedM3u,
	pageSlice,
	parseM3uPlaylist,
	parseM3uUrl,
} from "./m3u";

const EMPTY_DATE = new Date(0);
import {
	HttpResponseTooLargeError,
	safeFetch,
	stripUrlUserinfo,
} from "./safe-http";

const CATALOG_TTL_MS = 600_000;
const CATALOG_MAX_ENTRIES = 8;

type CatalogCacheEntry = {
	expires: number;
	playlistId: string;
	value: Promise<ParsedM3u>;
};

const catalogCache = new Map<string, CatalogCacheEntry>();

export function forgetM3uCatalog(playlistId: string) {
	for (const [key, entry] of catalogCache) {
		if (entry.playlistId === playlistId) {
			catalogCache.delete(key);
		}
	}
}

async function requestM3u(storedUrl: string) {
	const parts = parseM3uUrl(storedUrl);
	const target = stripUrlUserinfo(parts.storedUrl);
	try {
		return await safeFetch(target.url, {
			headers: {
				accept: "application/vnd.apple.mpegurl, audio/mpegurl, text/plain, */*",
				...target.headers,
			},
			timeoutMs: 25_000,
			maxBytes: M3U_MAX_BYTES,
			allowPrivateHosts: env.ALLOW_PRIVATE_PLAYLIST_HOSTS,
		});
	} catch (error) {
		if (error instanceof HttpResponseTooLargeError) {
			throw new M3uPlaylistError(
				"too_large",
				"This M3U playlist is too large to import.",
			);
		}
		console.warn(
			"[m3u] fetch failed:",
			error instanceof Error ? error.name : "unknown",
		);
		throw new M3uPlaylistError("network", "Unable to reach the playlist URL.");
	}
}

export async function fetchM3uPlaylist(storedUrl: string): Promise<ParsedM3u> {
	const response = await requestM3u(storedUrl);
	if (response.status === 884) {
		throw new M3uPlaylistError("server_refused", M3U_HTTP_884_REFUSAL);
	}
	if (!response.ok) {
		throw new M3uPlaylistError(
			"invalid",
			"This URL did not return a usable M3U playlist.",
		);
	}
	return parseM3uPlaylist(response.body.toString("utf8"));
}

/** Status and body for an add or edit. HTTP 884 does not expose the body. */
export async function retrieveSubmittedM3u(
	storedUrl: string,
): Promise<{ status: number; body: string }> {
	const response = await requestM3u(storedUrl);
	return {
		status: response.status,
		body: response.status === 884 ? "" : response.body.toString("utf8"),
	};
}

export async function readM3uCatalog(playlist: {
	id: string;
	m3uUrl: string | null;
}): Promise<ParsedM3u> {
	if (!playlist.m3uUrl) {
		throw new M3uPlaylistError("invalid", "This M3U playlist has no URL.");
	}
	const identity = parseM3uUrl(playlist.m3uUrl).identityKey;
	const key = `${playlist.id}:${identity}`;
	const now = Date.now();
	const hit = catalogCache.get(key);
	if (hit && hit.expires > now) {
		return hit.value;
	}

	for (const [entryKey, entry] of catalogCache) {
		if (entry.expires <= now) {
			catalogCache.delete(entryKey);
		}
	}
	while (catalogCache.size >= CATALOG_MAX_ENTRIES) {
		const oldest = catalogCache.keys().next().value;
		if (oldest === undefined) {
			break;
		}
		catalogCache.delete(oldest);
	}

	const value = fetchM3uPlaylist(playlist.m3uUrl);
	catalogCache.set(key, {
		expires: now + CATALOG_TTL_MS,
		playlistId: playlist.id,
		value,
	});
	value.catch(() => {
		if (catalogCache.get(key)?.value === value) {
			catalogCache.delete(key);
		}
	});
	return value;
}

function kindOf(section: "channel" | "movie" | "series"): M3uKind {
	if (section === "channel") {
		return "live";
	}
	if (section === "movie") {
		return "movie";
	}
	return "series";
}

export async function m3uCategories(
	playlist: { id: string; m3uUrl: string | null },
	section: "channel" | "movie" | "series",
): Promise<StandardXtreamCategory[]> {
	const parsed = await readM3uCatalog(playlist);
	return categoriesFor(parsed, kindOf(section)).map((category) => ({
		id: category.id,
		name: category.name,
		parentId: "",
	}));
}

export async function m3uChannels(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	page: number,
	limit: number,
) {
	return (await m3uChannelsPage(playlist, categoryId, page, limit)).items;
}

/** One page of the category, with the number of entries in the category. */
export async function m3uChannelsPage(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	page: number,
	limit: number,
) {
	const parsed = await readM3uCatalog(playlist);
	const items = parsed.live.filter((entry) => entry.categoryId === categoryId);
	return {
		items: pageSlice(items, page, limit).map((entry) => toChannel(entry)),
		total: items.length,
	};
}

export async function m3uChannel(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	channelId: string,
) {
	const parsed = await readM3uCatalog(playlist);
	const entry = parsed.live.find(
		(item) => item.id === channelId && item.categoryId === categoryId,
	);
	if (!entry) {
		return null;
	}
	return toChannel(entry);
}

export async function m3uMovies(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	page: number,
	limit: number,
) {
	return (await m3uMoviesPage(playlist, categoryId, page, limit)).items;
}

/** One page of the category, with the number of entries in the category. */
export async function m3uMoviesPage(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	page: number,
	limit: number,
) {
	const parsed = await readM3uCatalog(playlist);
	const items = parsed.movies.filter(
		(entry) => entry.categoryId === categoryId,
	);
	return {
		items: pageSlice(items, page, limit).map(toMovieListing),
		total: items.length,
	};
}

export async function m3uMovie(
	playlist: { id: string; m3uUrl: string | null },
	movieId: string,
) {
	const parsed = await readM3uCatalog(playlist);
	const entry = parsed.movies.find((item) => item.id === movieId);
	if (!entry) {
		return null;
	}
	return toMovie(entry);
}

export async function m3uShows(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	page: number,
	limit: number,
) {
	return (await m3uShowsPage(playlist, categoryId, page, limit)).items;
}

/** One page of the category, with the number of entries in the category. */
export async function m3uShowsPage(
	playlist: { id: string; m3uUrl: string | null },
	categoryId: string,
	page: number,
	limit: number,
) {
	const parsed = await readM3uCatalog(playlist);
	const items = parsed.shows.filter((show) =>
		show.categoryIds.includes(categoryId),
	);
	return {
		items: pageSlice(items, page, limit).map((show) => toShowListing(show)),
		total: items.length,
	};
}

export async function m3uShow(
	playlist: { id: string; m3uUrl: string | null },
	showId: string,
): Promise<StandardXtreamShow | null> {
	const parsed = await readM3uCatalog(playlist);
	const show = parsed.shows.find((item) => item.id === showId);
	if (!show) {
		return null;
	}
	const seasons = new Map<number, typeof show.episodes>();
	for (const episode of show.episodes) {
		const list = seasons.get(episode.seasonNumber) ?? [];
		list.push(episode);
		seasons.set(episode.seasonNumber, list);
	}
	const seasonNumbers = [...seasons.keys()].sort((left, right) => left - right);
	return {
		...toShowListing(show),
		seasons: seasonNumbers.map((seasonNumber) => {
			const episodes = seasons.get(seasonNumber) ?? [];
			const seasonId = `n${seasonNumber}`;
			return {
				id: seasonId,
				name: `Season ${seasonNumber}`,
				number: seasonNumber,
				episodeCount: episodes.length,
				overview: "",
				voteAverage: 0,
				releaseDate: null,
				cover: show.poster ?? "",
				showId: show.id,
				episodes: episodes.map((episode) => ({
					id: episode.id,
					number: episode.number,
					title: episode.title,
					plot: "",
					poster: episode.poster ?? "",
					cover: episode.poster ?? "",
					tmdbId: "",
					duration: 0,
					durationFormatted: "",
					voteAverage: 0,
					releaseDate: null,
					createdAt: EMPTY_DATE,
					showId: show.id,
					seasonId,
					url: episode.url,
					subtitles: [] as string[],
					bitrate: 0,
				})),
			};
		}),
	};
}

export async function m3uStreamTarget(
	playlist: { id: string; m3uUrl: string | null },
	itemId: string,
) {
	const parsed = await readM3uCatalog(playlist);
	return findM3uStream(parsed, itemId);
}

function toChannel(entry: ParsedM3u["live"][number]): StandardXtreamChannel {
	return {
		id: entry.id,
		name: entry.name,
		epgId: entry.epgId ?? "",
		number: entry.number,
		tvArchive: false,
		tvArchiveDuration: 0,
		logo: entry.logo ?? "",
		createdAt: EMPTY_DATE,
		categoryIds: entry.categoryIds,
		url: entry.url,
	};
}

function toMovieListing(
	entry: ParsedM3u["movies"][number],
): StandardXtreamMovieListing {
	return {
		id: entry.id,
		name: entry.name,
		plot: "",
		voteAverage: 0,
		poster: entry.poster ?? "",
		releaseDate: null,
		duration: 0,
		youtubeId: null,
		cast: [],
		director: [],
		genre: [],
		createdAt: EMPTY_DATE,
		categoryIds: entry.categoryIds,
		url: entry.url,
	};
}

function toMovie(entry: ParsedM3u["movies"][number]): StandardXtreamMovie {
	return {
		...toMovieListing(entry),
		categoryIds: entry.categoryIds,
		informationUrl: "",
		tmdbId: "",
		originalName: entry.name,
		cover: entry.poster ?? "",
		description: "",
		rating: { age: 0, mpaa: "" },
		country: "",
		durationFormatted: "",
		subtitles: [],
		actors: [],
	};
}

function toShowListing(
	show: ParsedM3u["shows"][number],
): Omit<StandardXtreamShow, "seasons"> {
	return {
		id: show.id,
		name: show.name,
		plot: "",
		voteAverage: 0,
		poster: show.poster ?? "",
		cover: show.poster ?? "",
		releaseDate: null,
		duration: 0,
		youtubeId: null,
		cast: [],
		director: [],
		genre: [],
		updatedAt: EMPTY_DATE,
		categoryIds: show.categoryIds,
	};
}
