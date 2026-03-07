import "server-only";
import prisma from "@moderniptvplayer/db";
import { env } from "@moderniptvplayer/env/server";
import Cryptr from "cryptr";
import {
	defineSerializers,
	Xtream,
	type XtreamEpisode,
} from "@iptv/xtream-api";
import { standardizedSerializer } from "@iptv/xtream-api/standardized";
import camelcaseKeys from "camelcase-keys";
import { getAuthenticatedUserId } from "./auth-utils";

const cryptr = new Cryptr(env.SECRET_KEY);

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
			const id = toStringSafe(data.streamId ?? data.stream_id ?? data.id);
			if (!id) {
				return [];
			}
			const categoryIdsRaw =
				data.categoryIds ??
				(data.categoryId !== undefined && data.categoryId !== null
					? [data.categoryId]
					: []);
			const releaseDateRaw = data.releaseDate ?? data.release_date;
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
					releaseDate: toDateSafe(releaseDateRaw),
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
			const id = toStringSafe(data.seriesId ?? data.series_id ?? data.id);
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
	show: (input: unknown) => {
		const data = toRecordSafe(
			camelcaseKeys(input as Record<string, unknown>, {
				deep: true,
			}),
		);
		const info = toRecordSafe(data.info);
		const seasons = Array.isArray(data.seasons)
			? data.seasons.map(toRecordSafe)
			: [];
		const episodesBySeason = isRecord(data.episodes) ? data.episodes : {};
		const seriesId = info.seriesId ?? info.series_id ?? info.id;
		const showId = toStringSafe(seriesId);
		if (!showId) {
			throw new Error("seriesId is required");
		}
		const flatEpisodes = Object.values(episodesBySeason).flatMap(
			(value): Record<string, unknown>[] =>
				Array.isArray(value) ? value.map(toRecordSafe) : [],
		);
		const episodes = flatEpisodes.map((episode) => {
			const episodeInfo = toRecordSafe(episode.info);
			const seasonNumber =
				episode.season ?? episode.seasonNumber ?? episodeInfo.season;
			const seasonEntry = seasons.find(
				(season) => season.seasonNumber === seasonNumber,
			);
			const seasonIdValue = seasonEntry?.id ?? seasonNumber;
			const seasonId = toStringSafe(seasonIdValue);
			const episodeId = toStringSafe(episode.id);
			return {
				id: episodeId,
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
		let seasonList: Record<string, unknown>[] = seasons;
		if (!Array.isArray(seasonList) || seasonList.length === 0) {
			seasonList = Object.keys(episodesBySeason).map((key) => {
				const seasonEpisodes = Array.isArray(episodesBySeason[key])
					? episodesBySeason[key].map(toRecordSafe)
					: [];
				const firstEpisode = toRecordSafe(seasonEpisodes[0]);
				const firstInfo = toRecordSafe(firstEpisode.info);
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
		const normalizedSeasons = seasonList.map((season, index: number) => {
			const seasonIdValue =
				season?.id ?? season?.seasonNumber ?? season?.number ?? index;
			const seasonId = toStringSafe(seasonIdValue);
			const seasonNumber = toNumberSafe(
				season?.seasonNumber ?? season?.number ?? index + 1,
			);
			const episodesForSeason = episodes.filter(
				(episode) => episode.seasonId === seasonId,
			);
			const episodeCount =
				season.episodeCount !== undefined && season.episodeCount !== null
					? toNumberSafe(season.episodeCount)
					: episodesForSeason.length;
			const releaseDate = season?.airDate ?? season?.releaseDate;
			return {
				id: seasonId,
				name: toStringSafe(season?.name) || `Season ${seasonNumber}`,
				episodeCount,
				overview: toStringSafe(season?.overview),
				voteAverage: toNumberSafe(season?.voteAverage),
				releaseDate: toDateSafe(releaseDate),
				number: Number(seasonNumber),
				cover: toStringSafe(season?.coverBig ?? season?.cover),
				showId,
				episodes: episodesForSeason,
			};
		});
		const categoryIds = toStringListSafe(info.categoryIds);
		const poster = info.cover ?? info.poster;
		const cover =
			getCoverFromBackdropSafe(info.backdropPath) ??
			info.coverBig ??
			info.cover ??
			info.poster;
		const cast = toStringListSafe(info.cast);
		const director = toStringListSafe(info.director);
		const genre = toStringListSafe(info.genre);
		return {
			id: showId,
			name: info.title ?? info.name ?? "",
			plot: info.plot ?? "",
			voteAverage: Number(info.rating ?? 0),
			poster,
			cover,
			duration: Number(info.episodeRunTime ?? 0) * 60,
			cast,
			director,
			genre,
			youtubeId: info.youtubeTrailer ?? info.youtubeId,
			releaseDate: toDateSafe(info.releaseDate),
			updatedAt: info.lastModified
				? new Date(Number(info.lastModified) * 1e3)
				: null,
			categoryIds,
			seasons: normalizedSeasons,
		};
	},
});

export async function getPlaylistById(playlistId: string) {
	const userId = await getAuthenticatedUserId();

	const playlist = await prisma.playlist.findUnique({
		where: {
			id: playlistId,
			userId,
		},
	});

	if (!playlist) {
		return null;
	}

	const decryptedPassword = cryptr.decrypt(playlist.password);

	return {
		serverUrl: playlist.serverUrl,
		username: playlist.username,
		password: decryptedPassword,
		playlistName: playlist.playlistName,
	};
}

export function createXtreamClient(playlist: {
	serverUrl: string;
	username: string;
	password: string;
}) {
	const xtream = new Xtream({
		url: playlist.serverUrl,
		username: playlist.username,
		password: playlist.password,
		serializer: safeSerializer,
	});

	return xtream;
}

export async function getShowSafe(
	playlist: {
		serverUrl: string;
		username: string;
		password: string;
	},
	showId: string,
) {
	const xtream = createXtreamClient(playlist);
	const baseUrl = playlist.serverUrl.replace(/\/$/, "");
	const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(
		playlist.username,
	)}&password=${encodeURIComponent(
		playlist.password,
	)}&action=get_series_info&series_id=${encodeURIComponent(showId)}`;
	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	const data = await response.json();

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
	Object.keys(episodesBySeason).forEach((seasonKey) => {
		const list = Array.isArray(episodesBySeason[seasonKey])
			? episodesBySeason[seasonKey]
			: [];
		list.forEach((episode: XtreamEpisode) => {
			if (!episode?.id) {
				return;
			}
			episode.url = xtream.generateStreamUrl({
				type: "episode",
				streamId: episode.id,
				extension: episode.container_extension ?? "mp4",
			});
		});
	});

	return safeSerializer.serializers.show(data);
}
