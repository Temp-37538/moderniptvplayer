import { defineSerializers, type XtreamEpisode } from "@iptv/xtream-api";
import { standardizedSerializer } from "@iptv/xtream-api/standardized";
import prisma from "@moderniptvplayer/db";
import { env } from "@moderniptvplayer/env/server";
import camelcaseKeys from "camelcase-keys";
import Cryptr from "cryptr";
import "server-only";
import { requireAuthenticatedUserId } from "./auth-utils";
import { processMap } from "./process-map";
import { SafeXtream } from "./xtream-client";

const cryptr = new Cryptr(env.SECRET_KEY);

export type DecryptedPlaylist = {
	id: string;
	source: "XTREAM" | "M3U";
	serverUrl: string;
	username: string;
	password: string;
	playlistName: string;
	/** Decrypted M3U URL. Null for Xtream. Never send this to the client. */
	m3uUrl: string | null;
};

// Decrypted credentials live only in this process, for a short time. They are
// deliberately NOT stored with `use cache`: cached values and cache keys can
// end up in a shared/persistent cache handler.
// Kept on globalThis: Next can load this module once per route bundle (a
// route handler and a server action do not share module state), and a
// per-bundle Map would let `forgetPlaylistCredentials` in an edit action miss
// the copy a route handler keeps serving.
const CREDENTIAL_TTL_MS = 60_000;
const MAX_CACHED_CREDENTIALS = 200;
const credentialCache = processMap<
	string,
	{ expires: number; value: DecryptedPlaylist }
>("playlist-credentials");

export function forgetPlaylistCredentials(playlistId: string) {
	for (const key of credentialCache.keys()) {
		if (key.endsWith(`:${playlistId}`)) {
			credentialCache.delete(key);
		}
	}
}

export async function getCachedPlaylistByUserAndId(
	userId: string,
	playlistId: string,
): Promise<DecryptedPlaylist | null> {
	const key = `${userId}:${playlistId}`;
	const now = Date.now();
	const hit = credentialCache.get(key);
	if (hit && hit.expires > now) {
		return hit.value;
	}

	const playlist = await prisma.playlist.findFirst({
		where: {
			id: playlistId,
			userId,
		},
	});
	const value = playlist ? decryptPlaylist(playlist) : null;
	if (!value) {
		credentialCache.delete(key);
		return null;
	}

	if (credentialCache.size >= MAX_CACHED_CREDENTIALS) {
		credentialCache.clear();
	}
	credentialCache.set(key, { expires: now + CREDENTIAL_TTL_MS, value });
	return value;
}

type StoredPlaylist = {
	id: string;
	source: string;
	serverUrl: string;
	username: string;
	password: string;
	playlistName: string;
	m3uUrl: string | null;
};

function decryptPlaylist(playlist: StoredPlaylist): DecryptedPlaylist | null {
	const source = playlist.source === "M3U" ? "M3U" : "XTREAM";
	let m3uUrl: string | null = null;
	let password = "";
	try {
		if (source === "M3U") {
			if (!playlist.m3uUrl) {
				return null;
			}
			m3uUrl = cryptr.decrypt(playlist.m3uUrl);
		} else {
			password = cryptr.decrypt(playlist.password);
		}
	} catch (error) {
		console.warn(
			"[playlist] decrypt failed:",
			error instanceof Error ? error.name : "unknown",
		);
		return null;
	}
	return {
		id: playlist.id,
		source,
		serverUrl: playlist.serverUrl,
		username: playlist.username,
		password,
		playlistName: playlist.playlistName,
		m3uUrl,
	};
}

/**
 * SQL fingerprint of the columns that decide which provider a playlist reads.
 * A rename does not change it; a new server, username, password, M3U URL or
 * source does (a re-encrypted password changes it too, which is harmless).
 * Only the hash leaves the database.
 */
export const PLAYLIST_SOURCE_FINGERPRINT_SQL = `md5(concat_ws(chr(31), "source"::text, "serverUrl", "username", "password", coalesce("m3uUrl", '')))`;

/**
 * Read a playlist straight from the database, never from the credential
 * cache, together with its source fingerprint taken in the same statement.
 * Long-running work (the catalogue sync) uses it so it cannot run on
 * credentials that an edit has already replaced.
 */
export async function readPlaylistSnapshot(
	userId: string,
	playlistId: string,
): Promise<{ playlist: DecryptedPlaylist; fingerprint: string } | null> {
	const rows = await prisma.$queryRawUnsafe<
		Array<StoredPlaylist & { fingerprint: string }>
	>(
		`SELECT "id", "source"::text AS "source", "serverUrl", "username", "password",
		        "playlistName", "m3uUrl", ${PLAYLIST_SOURCE_FINGERPRINT_SQL} AS "fingerprint"
		 FROM "playlist" WHERE "id" = $1 AND "userId" = $2 LIMIT 1`,
		playlistId,
		userId,
	);
	const row = rows[0];
	const playlist = row ? decryptPlaylist(row) : null;
	return row && playlist ? { playlist, fingerprint: row.fingerprint } : null;
}

export async function getPlaylistById(playlistId: string) {
	const userId = await requireAuthenticatedUserId();
	return getCachedPlaylistByUserAndId(userId, playlistId);
}

const PLAYLIST_STATUS_TTL_MS = 5 * 60_000;

export type PlaylistStatus = {
	status: string;
	expDate: number | null;
};

const playlistStatusCache = new Map<
	string,
	{ expires: number; value: PlaylistStatus }
>();

export function forgetPlaylistStatus(playlistId: string) {
	playlistStatusCache.delete(playlistId);
}

export async function getPlaylistStatus(
	playlistId: string,
): Promise<PlaylistStatus> {
	const now = Date.now();
	const hit = playlistStatusCache.get(playlistId);
	if (hit && hit.expires > now) {
		return hit.value;
	}

	const playlist = await getPlaylistById(playlistId);
	if (!playlist) {
		throw new Error("Playlist not found");
	}

	if (playlist.source === "M3U") {
		const value: PlaylistStatus = { status: "M3U", expDate: null };
		playlistStatusCache.set(playlistId, {
			expires: now + PLAYLIST_STATUS_TTL_MS,
			value,
		});
		return value;
	}

	const info = await createXtreamClient(playlist).getAccountInfo();
	const rawExpDate = info.exp_date;
	const parsedExpDate =
		rawExpDate === null ||
		rawExpDate === undefined ||
		rawExpDate === "" ||
		rawExpDate === "null"
			? Number.NaN
			: Number(rawExpDate);
	const value: PlaylistStatus = {
		status: toStringSafe(info.status),
		expDate: Number.isFinite(parsedExpDate) ? parsedExpDate : null,
	};

	playlistStatusCache.set(playlistId, {
		expires: now + PLAYLIST_STATUS_TTL_MS,
		value,
	});
	return value;
}

const toStringSafe = (value: unknown) =>
	value === undefined || value === null ? "" : String(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const toRecordSafe = (value: unknown): Record<string, unknown> =>
	isRecord(value) ? value : {};

const toNumberSafe = (value: unknown) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
};

const toDateSafe = (value: unknown) => {
	if (value === undefined || value === null || value === "") {
		return null;
	}
	const date =
		typeof value === "string" ||
		typeof value === "number" ||
		value instanceof Date
			? new Date(value)
			: new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
};

const toStringListSafe = (value: unknown) => {
	if (Array.isArray(value)) {
		return value.map((item) => toStringSafe(item)).filter(Boolean);
	}
	if (typeof value === "string") {
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [] as string[];
};

const getCoverFromBackdropSafe = (backdropPath: unknown) => {
	if (Array.isArray(backdropPath)) {
		const firstBackdrop = backdropPath.find(
			(item) => typeof item === "string" && item.length > 0,
		);
		return typeof firstBackdrop === "string" ? firstBackdrop : undefined;
	}
	return typeof backdropPath === "string" && backdropPath.length > 0
		? backdropPath
		: undefined;
};

function extractEpisodes(
	episodesBySeason: Record<string, unknown>,
	rawSeasons: Record<string, unknown>[],
	showId: string,
) {
	const flatEpisodes = Object.values(episodesBySeason).flatMap(
		(value): Record<string, unknown>[] =>
			Array.isArray(value) ? value.map(toRecordSafe) : [],
	);

	return flatEpisodes.map((episode) => {
		const episodeInfo = toRecordSafe(episode.info);
		const seasonNumber =
			episode.season ?? episode.seasonNumber ?? episodeInfo.season;
		const seasonEntry = rawSeasons.find(
			(season) => season.seasonNumber === seasonNumber,
		);
		const seasonId = toStringSafe(seasonEntry?.id ?? seasonNumber);

		return {
			id: toStringSafe(episode.id),
			number: Number(episode.episodeNum ?? episode.number ?? 0),
			plot: toStringSafe(episodeInfo.plot),
			title: toStringSafe(episode.title),
			poster: toStringSafe(episodeInfo.movieImage),
			cover: toStringSafe(episodeInfo.coverBig),
			duration: toNumberSafe(episodeInfo.durationSecs),
			durationFormatted: toStringSafe(episodeInfo.duration),
			voteAverage: toNumberSafe(episodeInfo.rating),
			releaseDate: toDateSafe(episodeInfo.releaseDate),
			createdAt: episode.added
				? toDateSafe(toNumberSafe(episode.added) * 1e3)
				: null,
			showId,
			seasonId,
			url: toStringSafe(episode.url),
			subtitles: toStringListSafe(episode.subtitles),
			bitrate: toNumberSafe(episodeInfo.bitrate),
		};
	});
}

function buildFallbackSeasons(episodesBySeason: Record<string, unknown>) {
	return Object.keys(episodesBySeason).map((key) => {
		const seasonEpisodes = Array.isArray(episodesBySeason[key])
			? episodesBySeason[key].map(toRecordSafe)
			: [];
		const firstInfo = toRecordSafe(toRecordSafe(seasonEpisodes[0]).info);
		return {
			id: Number(key),
			name: `Season ${key}`,
			episodeCount: seasonEpisodes.length,
			overview: "",
			airDate: firstInfo.releaseDate,
			cover: firstInfo.movieImage,
			seasonNumber: Number(key),
			voteAverage: Number(firstInfo.rating),
			coverBig: firstInfo.movieImage,
		};
	});
}

function normalizeSeasons(
	rawSeasons: Record<string, unknown>[],
	episodes: ReturnType<typeof extractEpisodes>,
	showId: string,
) {
	return rawSeasons.map((season, index) => {
		const seasonId = toStringSafe(
			season?.id ?? season?.seasonNumber ?? season?.number ?? index,
		);
		const seasonNumber = toNumberSafe(
			season?.seasonNumber ?? season?.number ?? index + 1,
		);
		const episodesForSeason = episodes.filter(
			(episode) => episode.seasonId === seasonId,
		);

		return {
			id: seasonId,
			name: toStringSafe(season?.name) || `Season ${seasonNumber}`,
			episodeCount:
				season.episodeCount !== undefined && season.episodeCount !== null
					? toNumberSafe(season.episodeCount)
					: episodesForSeason.length,
			overview: toStringSafe(season?.overview),
			voteAverage: toNumberSafe(season?.voteAverage),
			releaseDate: toDateSafe(season?.airDate ?? season?.releaseDate),
			number: seasonNumber,
			cover: toStringSafe(season?.coverBig ?? season?.cover),
			showId,
			episodes: episodesForSeason,
		};
	});
}

function extractShowInfo(
	info: Record<string, unknown>,
	showId: string,
	normalizedSeasons: ReturnType<typeof normalizeSeasons>,
) {
	return {
		id: showId,
		name: info.title ?? info.name ?? "",
		plot: info.plot ?? "",
		voteAverage: Number(info.rating ?? 0),
		poster: info.cover ?? info.poster,
		cover:
			getCoverFromBackdropSafe(info.backdropPath) ??
			info.coverBig ??
			info.cover ??
			info.poster,
		duration: Number(info.episodeRunTime ?? 0) * 60,
		cast: toStringListSafe(info.cast),
		director: toStringListSafe(info.director),
		genre: toStringListSafe(info.genre),
		youtubeId: info.youtubeTrailer ?? info.youtubeId,
		releaseDate: toDateSafe(info.releaseDate),
		updatedAt: info.lastModified
			? new Date(Number(info.lastModified) * 1e3)
			: null,
		categoryIds: toStringListSafe(info.categoryIds),
		seasons: normalizedSeasons,
	};
}

function serializeShow(input: unknown) {
	const data = toRecordSafe(
		camelcaseKeys(input as Record<string, unknown>, { deep: true }),
	);
	const info = toRecordSafe(data.info);
	const rawSeasons = Array.isArray(data.seasons)
		? data.seasons.map(toRecordSafe)
		: [];
	const episodesBySeason = isRecord(data.episodes) ? data.episodes : {};

	const showId = toStringSafe(info.seriesId ?? info.id);
	if (!showId) {
		throw new Error("seriesId is required");
	}

	const episodes = extractEpisodes(episodesBySeason, rawSeasons, showId);
	const seasons =
		rawSeasons.length > 0 ? rawSeasons : buildFallbackSeasons(episodesBySeason);
	const normalizedSeasons = normalizeSeasons(seasons, episodes, showId);

	return extractShowInfo(info, showId, normalizedSeasons);
}

const safeSerializer = defineSerializers("StandardizedSafe", {
	...standardizedSerializer.serializers,
	movies: (input: unknown) => {
		const movies = Array.isArray(input) ? input : [];
		return movies.flatMap((item) => {
			if (!item || typeof item !== "object") {
				return [];
			}
			const data = camelcaseKeys(item as Record<string, unknown>) as Record<
				string,
				unknown
			>;
			const id = toStringSafe(data.streamId ?? data.id);
			if (!id) {
				return [];
			}
			const categoryIdsRaw =
				data.categoryIds ??
				(data.categoryId !== undefined && data.categoryId !== null
					? [data.categoryId]
					: []);
			const createdAt =
				data.added !== undefined && data.added !== null
					? toDateSafe(toNumberSafe(data.added) * 1e3)
					: null;
			return [
				{
					id,
					name: toStringSafe(data.title ?? data.name),
					plot: toStringSafe(data.plot),
					genre: toStringListSafe(data.genre),
					cast: toStringListSafe(data.cast),
					director: toStringListSafe(data.director),
					poster: toStringSafe(data.streamIcon ?? data.poster ?? data.cover),
					duration: toNumberSafe(data.episodeRunTime) * 60,
					voteAverage: toNumberSafe(data.rating),
					releaseDate: toDateSafe(data.releaseDate),
					youtubeId:
						toStringSafe(data.youtubeTrailer ?? data.youtubeId) || null,
					createdAt,
					categoryIds: toStringListSafe(categoryIdsRaw),
					url: toStringSafe(data.url),
				},
			];
		});
	},
	shows: (input: unknown) => {
		const shows = Array.isArray(input) ? input : [];
		return shows.flatMap((item) => {
			if (!item || typeof item !== "object") {
				return [];
			}
			const data = camelcaseKeys(item as Record<string, unknown>) as Record<
				string,
				unknown
			>;
			const id = toStringSafe(data.seriesId ?? data.id);
			if (!id) {
				return [];
			}
			const cover =
				getCoverFromBackdropSafe(data.backdropPath) ??
				data.coverBig ??
				data.cover ??
				data.poster;
			const categoryIdsRaw =
				data.categoryIds ??
				(data.categoryId !== undefined && data.categoryId !== null
					? [data.categoryId]
					: []);
			return [
				{
					id,
					name: data.name ?? data.title ?? "",
					plot: data.plot ?? "",
					voteAverage: toNumberSafe(data.rating),
					poster: data.cover ?? data.poster,
					cover,
					duration: toNumberSafe(data.episodeRunTime) * 60,
					cast: [],
					director: [],
					genre: [],
					youtubeId: data.youtubeTrailer ?? data.youtubeId,
					releaseDate: toDateSafe(data.releaseDate),
					updatedAt: data.lastModified
						? toDateSafe(toNumberSafe(data.lastModified) * 1e3)
						: null,
					categoryIds: toStringListSafe(categoryIdsRaw),
				},
			];
		});
	},
	show: (input: unknown) => serializeShow(input),
});

export function createXtreamClient(playlist: {
	serverUrl: string;
	username: string;
	password: string;
}) {
	return new SafeXtream({
		url: playlist.serverUrl,
		username: playlist.username,
		password: playlist.password,
		serializer: safeSerializer,
		allowPrivateHosts: env.ALLOW_PRIVATE_PLAYLIST_HOSTS,
	});
}

type ShowPayload = {
	info?: Record<string, unknown> | null;
	episodes?: Record<string, unknown> | null;
} | null;

export async function getShowSafe(
	playlist: {
		serverUrl: string;
		username: string;
		password: string;
	},
	showId: string,
) {
	const xtream = createXtreamClient(playlist);
	const data = (await xtream.getSeriesInfoRaw(showId)) as ShowPayload;

	if (data?.info?.name === null) {
		throw new Error("Show Not Found");
	}

	if (data?.info && typeof data.info === "object") {
		if (data.info.series_id === undefined || data.info.series_id === null) {
			const numericShowId = Number(showId);
			data.info.series_id = Number.isFinite(numericShowId)
				? numericShowId
				: showId;
		}
	}

	const episodesBySeason =
		data?.episodes && typeof data.episodes === "object" ? data.episodes : {};
	for (const seasonKey of Object.keys(episodesBySeason)) {
		const seasonEpisodes = episodesBySeason[seasonKey];
		const list = Array.isArray(seasonEpisodes)
			? (seasonEpisodes as XtreamEpisode[])
			: [];
		for (const episode of list) {
			if (!episode?.id) {
				continue;
			}
			episode.url = xtream.generateStreamUrl({
				type: "episode",
				streamId: episode.id,
				extension: episode.container_extension ?? "mp4",
			});
		}
	}

	return serializeShow(data);
}
