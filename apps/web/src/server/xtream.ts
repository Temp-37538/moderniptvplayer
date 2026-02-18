import "server-only";
import prisma from "../../../../packages/db/src/index";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import Cryptr from "cryptr";
import "dotenv/config";
import { defineSerializers, Xtream, type XtreamEpisode } from "@iptv/xtream-api";
import { standardizedSerializer } from "@iptv/xtream-api/standardized";
import camelcaseKeys from "camelcase-keys";

const cryptr = new Cryptr(process.env.SECRET_KEY!);

const toStringSafe = (value: unknown) =>
	value === undefined || value === null ? "" : String(value);

const safeSerializer = defineSerializers("StandardizedSafe", {
	...standardizedSerializer.serializers,
	show: (input: unknown) => {
		const data = camelcaseKeys(input as Record<string, unknown>, {
			deep: true,
		}) as Record<string, any>;
		const info = data.info ?? {};
		const seasons = Array.isArray(data.seasons) ? data.seasons : [];
		const episodesBySeason =
			data.episodes && typeof data.episodes === "object" ? data.episodes : {};
		const seriesId = info.seriesId ?? info.series_id ?? info.id;
		const showId = toStringSafe(seriesId);
		const flatEpisodes = Object.values(episodesBySeason).flatMap((value) =>
			Array.isArray(value) ? value : [],
		);
		const episodes = flatEpisodes.map((episode: any) => {
			const episodeInfo = episode.info ?? {};
			const seasonNumber =
				episode.season ?? episode.seasonNumber ?? episodeInfo.season;
			const seasonEntry = seasons.find(
				(season: any) => season.seasonNumber === seasonNumber,
			);
			const seasonIdValue = seasonEntry?.id ?? seasonNumber;
			const seasonId = toStringSafe(seasonIdValue);
			const episodeId = toStringSafe(episode.id);
			return {
				id: episodeId,
				number: Number(episode.episodeNum ?? episode.number ?? 0),
				plot: episodeInfo.plot ?? "",
				title: episode.title ?? "",
				poster: episodeInfo.movieImage,
				cover: episodeInfo.coverBig,
				duration: episodeInfo.durationSecs,
				durationFormatted: episodeInfo.duration,
				voteAverage: episodeInfo.rating,
				releaseDate: episodeInfo.releaseDate
					? new Date(episodeInfo.releaseDate)
					: null,
				createdAt: episode.added ? new Date(Number(episode.added) * 1e3) : null,
				showId,
				seasonId,
				url: episode.url,
				subtitles: episode.subtitles ?? [],
				bitrate: episodeInfo.bitrate,
			};
		});
		let seasonList = seasons;
		if (!Array.isArray(seasonList) || seasonList.length === 0) {
			seasonList = Object.keys(episodesBySeason).map((key) => {
				const seasonEpisodes = Array.isArray(episodesBySeason[key])
					? episodesBySeason[key]
					: [];
				const firstEpisode = seasonEpisodes[0] ?? {};
				const firstInfo = firstEpisode.info ?? {};
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
		const normalizedSeasons = seasonList.map((season: any, index: number) => {
			const seasonIdValue =
				season?.id ?? season?.seasonNumber ?? season?.number ?? index;
			const seasonId = toStringSafe(seasonIdValue);
			const seasonNumber = season?.seasonNumber ?? season?.number ?? index + 1;
			const episodesForSeason = episodes.filter(
				(episode) => episode.seasonId === seasonId,
			);
			const episodeCount = Number.isFinite(season?.episodeCount)
				? season.episodeCount
				: episodesForSeason.length;
			const releaseDate = season?.airDate ?? season?.releaseDate;
			return {
				id: seasonId,
				name: season?.name ?? `Season ${seasonNumber}`,
				episodeCount,
				overview: season?.overview ?? "",
				voteAverage: season?.voteAverage ?? 0,
				releaseDate: releaseDate ? new Date(releaseDate) : null,
				number: Number(seasonNumber),
				cover: season?.coverBig ?? season?.cover,
				showId,
				episodes: episodesForSeason,
			};
		});
		const categoryIds = Array.isArray(info.categoryIds)
			? info.categoryIds.map((id: unknown) => toStringSafe(id)).filter(Boolean)
			: typeof info.categoryIds === "string"
				? info.categoryIds
						.split(",")
						.map((id: string) => id.trim())
						.filter(Boolean)
				: [];
		const poster = info.cover ?? info.poster;
		const cover = Array.isArray(info.backdropPath)
			? info.backdropPath[0]
			: (info.backdropPath ?? info.coverBig ?? info.cover ?? info.poster);
		const cast =
			typeof info.cast === "string"
				? info.cast
						.split(",")
						.map((d: string) => d.trim())
						.filter(Boolean)
				: Array.isArray(info.cast)
					? info.cast.filter(Boolean)
					: [];
		const director =
			typeof info.director === "string"
				? info.director
						.split(",")
						.map((d: string) => d.trim())
						.filter(Boolean)
				: Array.isArray(info.director)
					? info.director.filter(Boolean)
					: [];
		const genre =
			typeof info.genre === "string"
				? info.genre
						.split(",")
						.map((d: string) => d.trim())
						.filter(Boolean)
				: Array.isArray(info.genre)
					? info.genre.filter(Boolean)
					: [];
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
			releaseDate: info.releaseDate ? new Date(info.releaseDate) : null,
			updatedAt: info.lastModified
				? new Date(Number(info.lastModified) * 1e3)
				: null,
			categoryIds,
			seasons: normalizedSeasons,
		};
	},
});

export async function getPlaylistById(playlistId: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

	const playlist = await prisma.playlist.findUnique({
		where: {
			id: playlistId,
			userId: session.user.id,
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
			data.info.series_id = Number(showId);
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
