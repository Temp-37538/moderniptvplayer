import "server-only";
import { createHash } from "node:crypto";
import { safeFetchJson } from "./safe-http";

/**
 * Minimal Xtream Codes client. It replaces the network layer of
 * `@iptv/xtream-api` (which uses the global `fetch` with no timeout and no way
 * to restrict destinations) while keeping the same method names, the same URL
 * generation rules and the same serializers.
 */

type SerializerFn = (input: never) => unknown;

type SerializerKey =
	| "profile"
	| "serverInfo"
	| "channelCategories"
	| "movieCategories"
	| "showCategories"
	| "channels"
	| "movies"
	| "movie"
	| "shows"
	| "show"
	| "shortEPG"
	| "fullEPG";

export type XtreamSerializer = {
	type?: string;
	serializers: Partial<Record<SerializerKey, SerializerFn>>;
};

export type StreamUrlOptions =
	| {
			type: "channel";
			streamId: string | number;
			extension: string;
			timeshift?: { start: Date; duration: number };
	  }
	| { type: "episode"; streamId: string | number; extension: string }
	| { type: "movie"; streamId: string | number; extension: string };

type ListOptions = {
	categoryId?: string;
	page?: number;
	limit?: number;
};

type Profile = { allowed_output_formats?: string[] } | null;
type RawRecord = Record<string, unknown>;

export type XtreamClientOptions = {
	url: string;
	username: string;
	password: string;
	serializer?: XtreamSerializer;
	preferredFormat?: string;
	/** Allow private/loopback playlist servers (self-hosted LAN setups). */
	allowPrivateHosts?: boolean;
	timeoutMs?: number;
};

const RAW_CACHE_TTL_MS = 60_000;
const RAW_CACHE_MAX_ENTRIES = 8;
const MAX_PAGE_SIZE = 1000;

// Short-lived, in-process cache of raw upstream responses. The upstream API
// has no pagination: every page used to re-download the full list. Keys are
// hashed so credentials are never kept as map keys.
const rawCache = new Map<
	string,
	{ expires: number; value: Promise<unknown> }
>();

function readThrough<T>(key: string, load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = rawCache.get(key);
	if (hit && hit.expires > now) {
		return hit.value as Promise<T>;
	}

	for (const [entryKey, entry] of rawCache) {
		if (entry.expires <= now) {
			rawCache.delete(entryKey);
		}
	}
	while (rawCache.size >= RAW_CACHE_MAX_ENTRIES) {
		const oldest = rawCache.keys().next().value;
		if (oldest === undefined) {
			break;
		}
		rawCache.delete(oldest);
	}

	const value = load();
	rawCache.set(key, { expires: now + RAW_CACHE_TTL_MS, value });
	value.catch(() => {
		if (rawCache.get(key)?.value === value) {
			rawCache.delete(key);
		}
	});
	return value;
}

const toRecord = (value: unknown): RawRecord =>
	typeof value === "object" && value !== null ? (value as RawRecord) : {};

const toId = (value: unknown) =>
	typeof value === "string" || typeof value === "number" ? String(value) : "";

const enc = encodeURIComponent;

export class SafeXtream {
	readonly baseUrl: string;
	readonly serializerType: string;
	readonly #username: string;
	readonly #password: string;
	readonly #preferredFormat: string;
	readonly #serializers: Partial<Record<SerializerKey, SerializerFn>>;
	readonly #allowPrivateHosts: boolean;
	readonly #timeoutMs: number | undefined;
	readonly #cacheNamespace: string;
	#profile: Profile | undefined;

	constructor({
		url,
		username,
		password,
		serializer,
		preferredFormat,
		allowPrivateHosts,
		timeoutMs,
	}: XtreamClientOptions) {
		if (!url) {
			throw new Error("The Xtream URL is required");
		}
		if (!username || !password) {
			throw new Error("The authentication credentials are required");
		}
		this.#username = username.trim();
		this.#password = password.trim();
		this.baseUrl = url.replace(/\/$/, "");
		this.#preferredFormat = preferredFormat ?? "ts";
		this.#serializers = serializer?.serializers ?? {};
		this.serializerType = serializer?.type ?? "none";
		this.#allowPrivateHosts = allowPrivateHosts ?? false;
		this.#timeoutMs = timeoutMs;
		this.#cacheNamespace = createHash("sha256")
			.update(`${this.baseUrl}\0${this.#username}\0${this.#password}`)
			.digest("hex");
	}

	#serialize(key: SerializerKey, value: unknown) {
		const serializer = this.#serializers[key] as
			| ((input: unknown) => unknown)
			| undefined;
		return serializer ? serializer(value) : value;
	}

	#get(action: string, params: Record<string, string> = {}): Promise<unknown> {
		const query = Object.entries(params)
			.map(([name, value]) => `&${name}=${enc(value)}`)
			.join("");
		const url = `${this.baseUrl}/player_api.php?username=${enc(
			this.#username,
		)}&password=${enc(this.#password)}&action=${action}${query}`;

		return readThrough(`${this.#cacheNamespace}|${action}${query}`, () =>
			safeFetchJson(url, {
				allowPrivateHosts: this.#allowPrivateHosts,
				...(this.#timeoutMs ? { timeoutMs: this.#timeoutMs } : {}),
			}),
		);
	}

	async #getList(action: string, categoryId?: string): Promise<RawRecord[]> {
		const data = await this.#get(
			action,
			categoryId ? { category_id: categoryId } : {},
		);
		if (!Array.isArray(data)) {
			throw new Error("Unexpected response from playlist server");
		}
		return data as RawRecord[];
	}

	// The profile decides which output format live streams use. A failure here
	// must not break listing: the stream URL falls back to the requested format.
	async #ensureProfile() {
		if (this.#profile !== undefined) {
			return;
		}
		try {
			const data = toRecord(await this.#get("get_profile"));
			this.#profile = (data.user_info as Profile | undefined) ?? null;
		} catch {
			this.#profile = null;
		}
	}

	#paginate(items: RawRecord[], page?: number, limit?: number) {
		if (!page) {
			return items;
		}
		const size = Math.min(Math.max(Math.floor(limit || 10), 1), MAX_PAGE_SIZE);
		const start = (Math.max(Math.floor(page), 1) - 1) * size;
		return items.slice(start, start + size);
	}

	generateStreamUrl(options: StreamUrlOptions): string {
		const user = enc(this.#username);
		const pass = enc(this.#password);
		const id = enc(String(options.streamId));

		if (options.type === "episode") {
			return `${this.baseUrl}/series/${user}/${pass}/${id}.${options.extension}`;
		}
		if (options.type === "movie") {
			return `${this.baseUrl}/movie/${user}/${pass}/${id}.${options.extension}`;
		}

		let extension = this.#preferredFormat;
		if (extension === "rtmp") {
			return `${this.baseUrl}/live/${user}/${pass}/${id}.ts`;
		}
		if (options.timeshift) {
			const { start, duration } = options.timeshift;
			const formattedStart = start
				.toISOString()
				.replace(/:/g, "-")
				.replace("T", ":")
				.slice(0, -8);
			return `${this.baseUrl}/timeshift/${user}/${pass}/${duration}/${formattedStart}/${id}.ts`;
		}
		const allowed = this.#profile?.allowed_output_formats;
		if (!allowed?.includes(options.extension)) {
			extension = allowed?.[0] ?? options.extension;
		}
		return `${this.baseUrl}/live/${user}/${pass}/${id}.${extension}`;
	}

	async getProfile() {
		const data = toRecord(await this.#get("get_profile"));
		return this.#serialize("profile", data.user_info);
	}

	async getServerInfo() {
		const data = toRecord(await this.#get("get_server_info"));
		return this.#serialize("serverInfo", data.server_info);
	}

	async getChannelCategories() {
		return this.#serialize(
			"channelCategories",
			await this.#get("get_live_categories"),
		);
	}

	async getMovieCategories() {
		return this.#serialize(
			"movieCategories",
			await this.#get("get_vod_categories"),
		);
	}

	async getShowCategories() {
		return this.#serialize(
			"showCategories",
			await this.#get("get_series_categories"),
		);
	}

	#withChannelUrl(item: RawRecord): RawRecord {
		return {
			...item,
			url: this.generateStreamUrl({
				type: "channel",
				streamId: toId(item.stream_id),
				extension: this.#preferredFormat,
			}),
		};
	}

	async getChannels({ categoryId, page, limit }: ListOptions = {}) {
		await this.#ensureProfile();
		const all = await this.#getList("get_live_streams", categoryId);
		const items = this.#paginate(all, page, limit).map((item) =>
			this.#withChannelUrl(item),
		);
		return this.#serialize("channels", items) as unknown[];
	}

	/** One channel of a category, without serializing the whole category. */
	async getChannel({
		categoryId,
		channelId,
	}: {
		categoryId?: string;
		channelId: string;
	}) {
		await this.#ensureProfile();
		const all = await this.#getList("get_live_streams", categoryId);
		const match = all.find((item) => toId(item.stream_id) === channelId);
		if (!match) {
			return null;
		}
		const [channel] = this.#serialize("channels", [
			this.#withChannelUrl(match),
		]) as unknown[];
		return channel ?? null;
	}

	async getMovies({ categoryId, page, limit }: ListOptions = {}) {
		await this.#ensureProfile();
		const all = await this.#getList("get_vod_streams", categoryId);
		const items = this.#paginate(all, page, limit).map((item) => ({
			...item,
			url: this.generateStreamUrl({
				type: "movie",
				streamId: toId(item.stream_id),
				extension: toId(item.container_extension) || "mp4",
			}),
		}));
		return this.#serialize("movies", items) as unknown[];
	}

	async getMovie({ movieId }: { movieId: string }) {
		await this.#ensureProfile();
		const data = toRecord(await this.#get("get_vod_info", { vod_id: movieId }));
		const movieData = toRecord(data.movie_data);
		if (
			(Array.isArray(data.info) && data.info.length === 0) ||
			!toId(movieData.stream_id)
		) {
			throw new Error("Movie Not Found");
		}
		return this.#serialize("movie", {
			...data,
			url: this.generateStreamUrl({
				type: "movie",
				streamId: toId(movieData.stream_id),
				extension: toId(movieData.container_extension) || "mp4",
			}),
		});
	}

	async getShows({ categoryId, page, limit }: ListOptions = {}) {
		await this.#ensureProfile();
		const all = await this.#getList("get_series", categoryId);
		return this.#serialize(
			"shows",
			this.#paginate(all, page, limit),
		) as unknown[];
	}

	/** Raw `get_series_info` payload (a private copy, safe to mutate). */
	async getSeriesInfoRaw(showId: string): Promise<unknown> {
		await this.#ensureProfile();
		const data = await this.#get("get_series_info", { series_id: showId });
		return structuredClone(data);
	}

	async getShow({ showId }: { showId: string }) {
		const data = toRecord(await this.getSeriesInfoRaw(showId));
		const info = toRecord(data.info);
		if (info.name === null) {
			throw new Error("Show Not Found");
		}
		info.series_id = Number(showId);
		const episodes = toRecord(data.episodes);
		for (const seasonKey of Object.keys(episodes)) {
			const list = episodes[seasonKey];
			if (!Array.isArray(list)) {
				continue;
			}
			for (const episode of list as RawRecord[]) {
				episode.url = this.generateStreamUrl({
					type: "episode",
					streamId: toId(episode.id),
					extension: toId(episode.container_extension) || "mp4",
				});
			}
		}
		return this.#serialize("show", { ...data, info });
	}

	async getShortEPG({
		channelId,
		limit,
	}: {
		channelId: string;
		limit?: number;
	}) {
		const params: Record<string, string> = { stream_id: channelId };
		if (limit) {
			params.limit = String(limit);
		}
		return this.#serialize(
			"shortEPG",
			await this.#get("get_short_epg", params),
		);
	}

	async getFullEPG({ channelId }: { channelId: string }) {
		return this.#serialize(
			"fullEPG",
			await this.#get("get_simple_data_table", { stream_id: channelId }),
		);
	}
}
