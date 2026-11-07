import { sha256Hex } from "./playlist-identity.ts";

export const M3U_MAX_URL_LENGTH = 4096;
export const M3U_MAX_BYTES = 32 * 1024 * 1024;
export const M3U_MAX_ENTRIES = 80_000;
export const M3U_MAX_LINE_LENGTH = 100_000;

export type M3uKind = "live" | "movie" | "series";
export type M3uDelivery = "hls" | "mpegts" | "file";

export type M3uPlaylistErrorCode =
	| "invalid_url"
	| "network"
	| "invalid"
	| "too_large"
	| "empty"
	| "unsupported_url"
	| "server_refused";

export class M3uPlaylistError extends Error {
	readonly code: M3uPlaylistErrorCode;

	constructor(code: M3uPlaylistErrorCode, message: string) {
		super(message);
		this.name = "M3uPlaylistError";
		this.code = code;
	}
}

export type M3uUrlParts = {
	/** Original trimmed URL, including userinfo when the provider put it there. */
	storedUrl: string;
	/** Canonical URL with userinfo and hash removed. Safe to hash, not to log. */
	canonical: string;
	identityKey: string;
	/** scheme://host[:port] with no path, query, or userinfo. */
	origin: string;
};

const MOVIE_EXTENSIONS = new Set([
	"mp4",
	"mkv",
	"avi",
	"mov",
	"m4v",
	"webm",
	"wmv",
	"flv",
	"mpg",
	"mpeg",
]);

const EPISODE_PATTERN =
	/^(.*?)(?:^|[\s._(|-])S(\d{1,3})[\s._-]*E(\d{1,4})\b(.*)$/i;
const COMPACT_EPISODE_PATTERN =
	/^(.*?)(?:^|[\s._(|-])(\d{1,2})x(\d{2,4})\b(.*)$/i;

export function describeM3uFailure(error: unknown): string {
	if (error instanceof M3uPlaylistError) {
		return error.message;
	}
	return "Unable to load this M3U playlist.";
}

export const M3U_HTTP_884_REFUSAL =
	"The playlist server refused the M3U download (HTTP 884).";

export function http884UnsupportedUrlMessage(): string {
	return `${M3U_HTTP_884_REFUSAL} This address is not a get.php URL with a username and password, so Xtream login was not attempted. The credentials are not necessarily incorrect.`;
}

export function http884RejectedMessage(): string {
	return "The server rejected the Xtream login.";
}

export function http884UnreachableMessage(): string {
	return `${M3U_HTTP_884_REFUSAL} Xtream login could not be reached. This does not mean the credentials are incorrect.`;
}

export type XtreamPlaylistTarget = {
	username: string;
	password: string;
	serverUrl: string;
};

const XTREAM_USERNAME_MAX = 128;
const XTREAM_PASSWORD_MAX = 256;
const XTREAM_SERVER_MAX = 2048;
const GET_PHP_PATH = /^(.*)\/get\.php\/?$/i;

/**
 * Xtream M3U addresses look like `https://host:port/base/get.php?username&password`.
 * The server base keeps the scheme, host, port, and any directory before get.php.
 * Returns null when the URL cannot supply those Xtream parameters.
 */
export function xtreamTargetFromGetPhp(
	input: string,
): XtreamPlaylistTarget | null {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return null;
	}
	const path = GET_PHP_PATH.exec(url.pathname);
	if (!path) {
		return null;
	}
	const username = url.searchParams.get("username")?.trim() ?? "";
	const password = url.searchParams.get("password")?.trim() ?? "";
	if (
		!username ||
		!password ||
		username.length > XTREAM_USERNAME_MAX ||
		password.length > XTREAM_PASSWORD_MAX ||
		/[\r\n]/.test(username) ||
		/[\r\n]/.test(password)
	) {
		return null;
	}

	const server = new URL(url.origin);
	const directory = path[1] ?? "";
	server.pathname = directory === "" ? "/" : directory;
	server.search = "";
	server.hash = "";
	server.username = "";
	server.password = "";
	const serverUrl = server.toString().replace(/\/+$/, "");
	if (!serverUrl || serverUrl.length > XTREAM_SERVER_MAX) {
		return null;
	}
	return { username, password, serverUrl };
}

export type XtreamLoginCheck = {
	ok: boolean;
	error?: "network";
};

export type M3uImportDecision =
	| { mode: "m3u"; parsed: ParsedM3u }
	| { mode: "xtream"; target: XtreamPlaylistTarget };

/**
 * HTTP 884 ignores the body and tries Xtream only for a get.php URL.
 * Any other status keeps the normal M3U result, including a get.php URL
 * that actually returned a playlist.
 */
export async function decideM3uImport(input: {
	storedUrl: string;
	status: number;
	body: string;
	validateXtream: (target: XtreamPlaylistTarget) => Promise<XtreamLoginCheck>;
}): Promise<M3uImportDecision> {
	if (input.status === 884) {
		const target = xtreamTargetFromGetPhp(input.storedUrl);
		if (!target) {
			throw new M3uPlaylistError(
				"unsupported_url",
				http884UnsupportedUrlMessage(),
			);
		}
		const login = await input.validateXtream(target);
		if (login.error === "network") {
			throw new M3uPlaylistError("network", http884UnreachableMessage());
		}
		if (!login.ok) {
			throw new M3uPlaylistError("server_refused", http884RejectedMessage());
		}
		return { mode: "xtream", target };
	}

	if (input.status < 200 || input.status >= 300) {
		throw new M3uPlaylistError(
			"invalid",
			"This URL did not return a usable M3U playlist.",
		);
	}

	return { mode: "m3u", parsed: parseM3uPlaylist(input.body) };
}

export function parseM3uUrl(input: string): M3uUrlParts {
	const storedUrl = input.trim();
	if (!storedUrl || storedUrl.length > M3U_MAX_URL_LENGTH) {
		throw new M3uPlaylistError("invalid_url", "Enter an http(s) playlist URL.");
	}
	if (/\s/.test(storedUrl)) {
		throw new M3uPlaylistError("invalid_url", "Enter an http(s) playlist URL.");
	}

	let url: URL;
	try {
		url = new URL(storedUrl);
	} catch {
		throw new M3uPlaylistError("invalid_url", "Enter an http(s) playlist URL.");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new M3uPlaylistError("invalid_url", "Enter an http(s) playlist URL.");
	}

	const canonicalUrl = canonicalM3uUrl(url);
	return {
		storedUrl,
		canonical: canonicalUrl.toString(),
		identityKey: sha256Hex(canonicalUrl.toString()),
		origin: canonicalUrl.origin,
	};
}

export function canonicalM3uUrl(url: URL): URL {
	const copy = new URL(url.toString());
	copy.hash = "";
	copy.username = "";
	copy.password = "";
	copy.hostname = copy.hostname.toLowerCase().replace(/\.$/, "");
	const entries = [...copy.searchParams.entries()].sort((left, right) => {
		if (left[0] === right[0]) {
			return left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0;
		}
		return left[0] < right[0] ? -1 : 1;
	});
	copy.search = "";
	for (const [key, value] of entries) {
		copy.searchParams.append(key, value);
	}
	if (copy.pathname.length > 1) {
		copy.pathname = copy.pathname.replace(/\/+$/, "");
	}
	return copy;
}

/**
 * Category id for one M3U group inside one content kind.
 * The prefix keeps it distinct from numeric Xtream category ids.
 * The same group name in live, movies, and series gets three ids.
 */
export function m3uCategoryId(kind: M3uKind, group: string): string {
	const letter = kind === "live" ? "l" : kind === "movie" ? "m" : "s";
	const hash = sha256Hex(
		`${kind}\n${normalizeLabel(group).toLowerCase()}`,
	).slice(0, 20);
	return `m3u${letter}${hash}`;
}

export function m3uItemId(streamUrl: string): string {
	const canonical = canonicalStreamUrl(streamUrl);
	return `i${sha256Hex(canonical).slice(0, 24)}`;
}

export function m3uShowId(showName: string): string {
	return `s${sha256Hex(`show\n${normalizeLabel(showName).toLowerCase()}`).slice(0, 24)}`;
}

export function liveSourceKind(url: string): "hls" | "mpegts" {
	try {
		const path = new URL(url).pathname.toLowerCase();
		if (path.endsWith(".ts")) {
			return "mpegts";
		}
	} catch {
		// Unknown URLs are offered as HLS. The proxy still checks the response.
	}
	return "hls";
}

export type M3uCategory = {
	id: string;
	name: string;
	kind: M3uKind;
};

export type M3uLiveEntry = {
	id: string;
	name: string;
	categoryId: string;
	categoryIds: string[];
	logo: string | null;
	url: string;
	number: number;
	epgId: string | null;
	delivery: M3uDelivery;
};

export type M3uMovieEntry = {
	id: string;
	name: string;
	categoryId: string;
	categoryIds: string[];
	poster: string | null;
	url: string;
	extension: string;
};

export type M3uEpisode = {
	id: string;
	title: string;
	number: number;
	seasonNumber: number;
	url: string;
	extension: string;
	poster: string | null;
	categoryId: string;
};

export type M3uShow = {
	id: string;
	name: string;
	poster: string | null;
	categoryIds: string[];
	episodes: M3uEpisode[];
};

export type ParsedM3u = {
	categories: M3uCategory[];
	live: M3uLiveEntry[];
	movies: M3uMovieEntry[];
	shows: M3uShow[];
};

export function parseM3uPlaylist(text: string): ParsedM3u {
	if (text.length > M3U_MAX_BYTES) {
		throw new M3uPlaylistError(
			"too_large",
			"This M3U playlist is too large to import.",
		);
	}

	const source = text.replace(/^\uFEFF/, "");
	if (!/#EXTINF:/i.test(source)) {
		throw new M3uPlaylistError(
			"invalid",
			"This URL did not return a usable M3U playlist.",
		);
	}

	const lines = source.split(/\r\n|\n|\r/);
	const usedIds = new Set<string>();
	const categories: M3uCategory[] = [];
	const categoryIndex = new Map<string, M3uCategory>();
	const live: M3uLiveEntry[] = [];
	const movies: M3uMovieEntry[] = [];
	const showsById = new Map<string, M3uShow>();
	const showOrder: M3uShow[] = [];
	const liveNumbers = new Map<string, number>();
	const seriesNumbers = new Map<string, number>();
	let pendingGroup: string | null = null;
	let pending: { attrs: Map<string, string>; title: string } | null = null;
	let count = 0;

	const pushCategory = (kind: M3uKind, group: string) => {
		const name = normalizeLabel(group);
		const id = m3uCategoryId(kind, name);
		const key = `${kind}\n${id}`;
		const existing = categoryIndex.get(key);
		if (existing) {
			return existing;
		}
		const created = { id, name, kind };
		categoryIndex.set(key, created);
		categories.push(created);
		return created;
	};

	const takeId = (streamUrl: string) => {
		const base = m3uItemId(streamUrl);
		if (!usedIds.has(base)) {
			usedIds.add(base);
			return base;
		}
		for (let suffix = 2; suffix < 1000; suffix += 1) {
			const next = `${base}x${suffix}`;
			if (!usedIds.has(next) && next.length <= 64) {
				usedIds.add(next);
				return next;
			}
		}
		throw new M3uPlaylistError(
			"too_large",
			"This M3U playlist is too large to import.",
		);
	};

	for (const rawLine of lines) {
		if (rawLine.length > M3U_MAX_LINE_LENGTH) {
			pending = null;
			continue;
		}
		const line = rawLine.trim();
		if (!line) {
			continue;
		}
		const groupLine = /^#EXTGRP:(.*)$/i.exec(line);
		if (groupLine) {
			pendingGroup = groupLine[1]?.trim() || null;
			continue;
		}
		if (line.startsWith("#")) {
			const extinf = parseExtinf(line);
			if (extinf) {
				pending = extinf;
			}
			continue;
		}
		if (!pending) {
			continue;
		}
		const streamUrl = normalizeStreamUrl(line);
		const current = pending;
		pending = null;
		if (!streamUrl) {
			continue;
		}
		count += 1;
		if (count > M3U_MAX_ENTRIES) {
			throw new M3uPlaylistError(
				"too_large",
				"This M3U playlist is too large to import.",
			);
		}

		const group =
			current.attrs.get("group-title")?.trim() ||
			pendingGroup ||
			"Uncategorized";
		const title =
			current.title || current.attrs.get("tvg-name")?.trim() || "Untitled";
		const logo = httpLogo(current.attrs.get("tvg-logo"));
		const classified = classifyEntry({
			title,
			group,
			url: streamUrl,
			attrs: current.attrs,
		});
		const category = pushCategory(classified.kind, group);

		if (classified.kind === "live") {
			const number = (liveNumbers.get(category.id) ?? 0) + 1;
			liveNumbers.set(category.id, number);
			const channelNumber =
				positiveInt(current.attrs.get("tvg-chno")) ?? number;
			live.push({
				id: takeId(streamUrl),
				name: clip(title),
				categoryId: category.id,
				categoryIds: [category.id],
				logo,
				url: streamUrl,
				number: channelNumber,
				epgId: clip(current.attrs.get("tvg-id") ?? "") || null,
				delivery: deliveryForUrl(streamUrl),
			});
			continue;
		}

		if (classified.kind === "movie") {
			movies.push({
				id: takeId(streamUrl),
				name: clip(title),
				categoryId: category.id,
				categoryIds: [category.id],
				poster: logo,
				url: streamUrl,
				extension: fileExtension(streamUrl),
			});
			continue;
		}

		const showName = clip(classified.showName || title);
		const showId = m3uShowId(showName);
		let show = showsById.get(showId);
		if (!show) {
			show = {
				id: showId,
				name: showName,
				poster: logo,
				categoryIds: [],
				episodes: [],
			};
			showsById.set(showId, show);
			showOrder.push(show);
		}
		if (!show.poster && logo) {
			show.poster = logo;
		}
		if (!show.categoryIds.includes(category.id)) {
			show.categoryIds.push(category.id);
		}
		const seasonNumber = classified.season ?? 1;
		const episodeNumber =
			classified.episode ??
			nextSeriesNumber(seriesNumbers, `${showId}\n${seasonNumber}`);
		show.episodes.push({
			id: takeId(streamUrl),
			title: clip(classified.episodeTitle || `Episode ${episodeNumber}`),
			number: episodeNumber,
			seasonNumber,
			url: streamUrl,
			extension: fileExtension(streamUrl),
			poster: logo,
			categoryId: category.id,
		});
	}

	if (live.length === 0 && movies.length === 0 && showOrder.length === 0) {
		throw new M3uPlaylistError(
			"empty",
			"This URL did not return a usable M3U playlist.",
		);
	}

	for (const show of showOrder) {
		show.episodes.sort((left, right) => {
			if (left.seasonNumber !== right.seasonNumber) {
				return left.seasonNumber - right.seasonNumber;
			}
			if (left.number !== right.number) {
				return left.number - right.number;
			}
			return left.title < right.title ? -1 : left.title > right.title ? 1 : 0;
		});
	}

	categories.sort((left, right) => {
		if (left.kind !== right.kind) {
			return kindOrder(left.kind) - kindOrder(right.kind);
		}
		return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
	});

	return { categories, live, movies, shows: showOrder };
}

export function categoriesFor(
	parsed: ParsedM3u,
	kind: M3uKind,
): Array<{ id: string; name: string }> {
	return parsed.categories
		.filter((category) => category.kind === kind)
		.map((category) => ({ id: category.id, name: category.name }));
}

export function pageSlice<T>(
	items: readonly T[],
	page: number,
	limit: number,
): T[] {
	const size = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
	const index = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	const start = (index - 1) * size;
	return items.slice(start, start + size);
}

export function findM3uStream(
	parsed: ParsedM3u,
	itemId: string,
): { url: string; kind: M3uKind; delivery: M3uDelivery } | null {
	const live = parsed.live.find((entry) => entry.id === itemId);
	if (live) {
		return { url: live.url, kind: "live", delivery: live.delivery };
	}
	const movie = parsed.movies.find((entry) => entry.id === itemId);
	if (movie) {
		return {
			url: movie.url,
			kind: "movie",
			delivery: movie.extension === "m3u8" ? "hls" : "file",
		};
	}
	for (const show of parsed.shows) {
		const episode = show.episodes.find((entry) => entry.id === itemId);
		if (episode) {
			return {
				url: episode.url,
				kind: "series",
				delivery: episode.extension === "m3u8" ? "hls" : "file",
			};
		}
	}
	return null;
}

type ClassifiedEntry = {
	kind: M3uKind;
	showName?: string;
	season?: number;
	episode?: number;
	episodeTitle?: string;
};

export function classifyEntry(input: {
	title: string;
	group: string;
	url: string;
	attrs: ReadonlyMap<string, string>;
}): ClassifiedEntry {
	const explicit = explicitKind(
		input.attrs.get("tvg-type") ?? input.attrs.get("type"),
	);
	const episode = parseEpisode(input.title);
	const path = urlPath(input.url);
	const extension = fileExtension(input.url);
	const movieGroup = hasWord(input.group, [
		"movie",
		"movies",
		"vod",
		"film",
		"films",
		"cinema",
	]);
	const seriesGroup = hasWord(input.group, [
		"series",
		"show",
		"shows",
		"episode",
		"episodes",
	]);

	if (explicit === "series" || episode || path.includes("/series/")) {
		return {
			kind: "series",
			showName: episode?.showName || input.title,
			season: episode?.season,
			episode: episode?.episode,
			episodeTitle: episode?.episodeTitle,
		};
	}
	if (
		explicit === "movie" ||
		path.includes("/movie/") ||
		path.includes("/vod/") ||
		(movieGroup && !seriesGroup) ||
		MOVIE_EXTENSIONS.has(extension)
	) {
		return { kind: "movie" };
	}
	if (explicit === "live") {
		return { kind: "live" };
	}
	if (seriesGroup && !movieGroup) {
		return { kind: "series", showName: input.title };
	}
	return { kind: "live" };
}

function explicitKind(value: string | undefined): M3uKind | null {
	const kind = value?.trim().toLowerCase();
	if (!kind) {
		return null;
	}
	if (kind === "movie" || kind === "vod" || kind === "film") {
		return "movie";
	}
	if (kind === "series" || kind === "show" || kind === "episode") {
		return "series";
	}
	if (kind === "live" || kind === "channel" || kind === "tv") {
		return "live";
	}
	return null;
}

function parseEpisode(title: string): {
	showName: string;
	season: number;
	episode: number;
	episodeTitle: string;
} | null {
	const match =
		EPISODE_PATTERN.exec(title) ?? COMPACT_EPISODE_PATTERN.exec(title);
	if (!match) {
		return null;
	}
	const showName = cleanShowName(match[1] ?? "");
	const season = Number(match[2]);
	const episode = Number(match[3]);
	if (!showName || !Number.isFinite(season) || !Number.isFinite(episode)) {
		return null;
	}
	return {
		showName,
		season,
		episode,
		episodeTitle: cleanShowName(match[4] ?? "") || `Episode ${episode}`,
	};
}

function parseExtinf(
	line: string,
): { attrs: Map<string, string>; title: string } | null {
	const match = /^#EXTINF:[^\s,]*(.*)$/i.exec(line);
	if (!match) {
		return null;
	}
	const rest = (match[1] ?? "").trim();
	let splitAt = -1;
	let quote: '"' | "'" | null = null;
	for (let index = 0; index < rest.length; index += 1) {
		const character = rest[index];
		if (quote) {
			if (character === quote) {
				quote = null;
			}
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (character === ",") {
			splitAt = index;
			break;
		}
	}
	const attrSource = splitAt === -1 ? rest : rest.slice(0, splitAt);
	const title = splitAt === -1 ? "" : rest.slice(splitAt + 1).trim();
	const attrs = new Map<string, string>();
	const attrPattern =
		/([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
	for (const attr of attrSource.matchAll(attrPattern)) {
		const key = attr[1]?.toLowerCase();
		const value = attr[2] ?? attr[3] ?? attr[4] ?? "";
		if (key && value.length <= 2048) {
			attrs.set(key, value.trim());
		}
	}
	return { attrs, title };
}

function normalizeStreamUrl(value: string): string | null {
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return null;
		}
		if (!url.hostname) {
			return null;
		}
		return url.toString();
	} catch {
		return null;
	}
}

function canonicalStreamUrl(value: string): string {
	try {
		return canonicalM3uUrl(new URL(value)).toString();
	} catch {
		return value.trim();
	}
}

function deliveryForUrl(url: string): M3uDelivery {
	const extension = fileExtension(url);
	if (extension === "m3u8" || extension === "m3u") {
		return "hls";
	}
	if (extension === "ts") {
		return "mpegts";
	}
	return "file";
}

function fileExtension(url: string): string {
	try {
		const path = new URL(url).pathname.toLowerCase();
		const match = /\.([a-z0-9]{2,5})$/i.exec(path);
		const extension = match?.[1]?.toLowerCase() ?? "mp4";
		return extension === "m3u" ? "m3u8" : extension;
	} catch {
		return "mp4";
	}
}

function urlPath(url: string): string {
	try {
		return new URL(url).pathname.toLowerCase();
	} catch {
		return "";
	}
}

function httpLogo(value: string | undefined): string | null {
	const logo = value?.trim() ?? "";
	if (!/^https?:\/\//i.test(logo) || logo.length > 2048) {
		return null;
	}
	return logo;
}

function normalizeLabel(value: string): string {
	const trimmed = value.trim().replace(/\s+/g, " ");
	return trimmed.length > 0 ? trimmed : "Uncategorized";
}

function cleanShowName(value: string): string {
	return value
		.replace(/^[\s._:|-]+|[\s._:|-]+$/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function clip(value: string): string {
	return value.trim().slice(0, 300);
}

function positiveInt(value: string | undefined): number | null {
	if (!value) {
		return null;
	}
	const number = Number(value);
	if (!Number.isInteger(number) || number <= 0 || number > 1_000_000) {
		return null;
	}
	return number;
}

function hasWord(value: string, words: readonly string[]): boolean {
	const text = value.toLowerCase();
	return words.some((word) =>
		new RegExp(`(?:^|[^a-z])${word}(?:$|[^a-z])`).test(text),
	);
}

function nextSeriesNumber(numbers: Map<string, number>, key: string): number {
	const next = (numbers.get(key) ?? 0) + 1;
	numbers.set(key, next);
	return next;
}

function kindOrder(kind: M3uKind): number {
	if (kind === "live") {
		return 0;
	}
	if (kind === "movie") {
		return 1;
	}
	return 2;
}
