/**
 * Defaults for sparse Xtream panels. Kept free of server-only imports so the
 * real serializers can be exercised in unit tests.
 */

type RawRecord = Record<string, unknown>;

const toRecord = (value: unknown): RawRecord =>
	typeof value === "object" && value !== null ? (value as RawRecord) : {};

const toId = (value: unknown) =>
	typeof value === "string" || typeof value === "number" ? String(value) : "";

/**
 * Fills the fields the library serializers read without checking, so a panel
 * that omits `category_ids`, `backdrop_path`, `tmdb_id` or an episode's
 * `info` cannot crash a page. Returns copies: raw responses are shared
 * through the response cache.
 */
function withListDefaults(value: unknown): RawRecord {
	const item = toRecord(value);
	const id = toId(item.category_id);
	return {
		...item,
		category_ids: Array.isArray(item.category_ids)
			? item.category_ids
			: id
				? [id]
				: [],
		backdrop_path: Array.isArray(item.backdrop_path)
			? item.backdrop_path
			: typeof item.backdrop_path === "string" && item.backdrop_path
				? [item.backdrop_path]
				: [],
	};
}

export function fillSerializerDefaults(key: string, value: unknown): unknown {
	if (key === "channels" || key === "movies" || key === "shows") {
		return Array.isArray(value) ? value.map(withListDefaults) : value;
	}
	if (key === "movie") {
		const data = toRecord(value);
		const info = withListDefaults(Array.isArray(data.info) ? {} : data.info);
		return {
			...data,
			info: { ...info, tmdb_id: toId(info.tmdb_id) },
			movie_data: withListDefaults(data.movie_data),
		};
	}
	if (key === "show") {
		const data = toRecord(value);
		const episodes: RawRecord = {};
		for (const [season, list] of Object.entries(toRecord(data.episodes))) {
			if (!Array.isArray(list)) {
				continue;
			}
			const filled = list
				.filter((episode) => typeof episode === "object" && episode !== null)
				.map((episode: RawRecord) => ({
					...episode,
					season: episode.season ?? (Number(season) || season),
					info: toRecord(episode.info),
				}));
			// An empty season has nothing to show, and the serializer reads its
			// first episode when the panel sends no season list.
			if (filled.length > 0) {
				episodes[season] = filled;
			}
		}
		return {
			...data,
			info: withListDefaults(data.info),
			episodes,
			seasons: Array.isArray(data.seasons)
				? data.seasons.filter((season) => toId(toRecord(season).id) !== "")
				: [],
		};
	}
	return value;
}
