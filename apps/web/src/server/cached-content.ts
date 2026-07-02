import "server-only";
import type {
	StandardXtreamCategory,
	StandardXtreamChannel,
	StandardXtreamMovie,
	StandardXtreamMovieListing,
	StandardXtreamShow,
} from "@iptv/xtream-api/standardized";
import { cacheLife, cacheTag } from "next/cache";
import { createXtreamClient, getShowSafe } from "@/server/xtream";

type XtreamPlaylistCredentials = {
	serverUrl: string;
	username: string;
	password: string;
};

const MOVIE_FETCH_MAX_ATTEMPTS = 3;
const MOVIE_FETCH_RETRY_DELAY_MS = 150;

const getMovieCategoriesCacheTag = (playlistId: string) =>
	`playlist-${playlistId}-movie-categories`;

const getSeriesCategoriesCacheTag = (playlistId: string) =>
	`playlist-${playlistId}-series-categories`;

const getChannelCategoriesCacheTag = (playlistId: string) =>
	`playlist-${playlistId}-channel-categories`;

const getChannelsCacheTag = (
	playlistId: string,
	categoryId: string,
	page: number,
) => `playlist-${playlistId}-channels-category-${categoryId}-page-${page}`;

const getChannelCacheTag = (playlistId: string, channelId: string) =>
	`playlist-${playlistId}-channel-${channelId}`;

const getMoviesCacheTag = (
	playlistId: string,
	categoryId: string,
	page: number,
) => `playlist-${playlistId}-movies-category-${categoryId}-page-${page}`;

const getMovieCacheTag = (playlistId: string, movieId: string) =>
	`playlist-${playlistId}-movie-${movieId}`;

const getShowsCacheTag = (
	playlistId: string,
	categoryId: string,
	page: number,
) => `playlist-${playlistId}-shows-category-${categoryId}-page-${page}`;

const getShowCacheTag = (playlistId: string, showId: string) =>
	`playlist-${playlistId}-show-${showId}`;

const getPlaylistParentTag = (playlistId: string) => `playlist-${playlistId}`;

export const getPlaylistCacheTags = (playlistId: string) =>
	[
		getMovieCategoriesCacheTag(playlistId),
		getSeriesCategoriesCacheTag(playlistId),
		getChannelCategoriesCacheTag(playlistId),
		getPlaylistParentTag(playlistId),
	] as const;

export async function getCachedMovieCategories(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getMovieCategoriesCacheTag(playlistId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getMovieCategories();
	return categories as StandardXtreamCategory[];
}

export async function getCachedSeriesCategories(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getSeriesCategoriesCacheTag(playlistId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getShowCategories();
	return categories as StandardXtreamCategory[];
}

export async function getCachedChannelCategories(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getChannelCategoriesCacheTag(playlistId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getChannelCategories();
	return categories as StandardXtreamCategory[];
}

export async function getCachedChannels(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
	categoryId: string,
	page: number,
	limit: number,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getChannelsCacheTag(playlistId, categoryId, page));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	return (await xtream.getChannels({
		categoryId,
		page,
		limit,
	})) as StandardXtreamChannel[];
}

export async function getCachedChannel(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
	categoryId: string,
	channelId: string,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getChannelCacheTag(playlistId, channelId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	const allChannels = (await xtream.getChannels({
		categoryId,
	})) as StandardXtreamChannel[];
	return allChannels.find((ch) => ch.id === channelId) ?? null;
}

export async function getCachedMovies(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
	categoryId: string,
	page: number,
	limit: number,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getMoviesCacheTag(playlistId, categoryId, page));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	return (await xtream.getMovies({
		categoryId,
		page,
		limit,
	})) as StandardXtreamMovieListing[];
}

export async function getCachedMovie(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
	movieId: string,
): Promise<StandardXtreamMovie | null> {
	"use cache";
	cacheLife("hours");
	cacheTag(getMovieCacheTag(playlistId, movieId));
	cacheTag(getPlaylistParentTag(playlistId));

	const xtream = createXtreamClient(playlist);

	let lastError: unknown;
	for (let attempt = 1; attempt <= MOVIE_FETCH_MAX_ATTEMPTS; attempt += 1) {
		try {
			return (await xtream.getMovie({ movieId })) as StandardXtreamMovie;
		} catch (error) {
			lastError = error;
			const isMovieNotFound =
				error instanceof Error && error.message === "Movie Not Found";

			if (isMovieNotFound && attempt === MOVIE_FETCH_MAX_ATTEMPTS) {
				return null;
			}

			if (attempt < MOVIE_FETCH_MAX_ATTEMPTS) {
				await new Promise((resolve) =>
					setTimeout(resolve, MOVIE_FETCH_RETRY_DELAY_MS),
				);
				continue;
			}

			throw error;
		}
	}

	throw lastError;
}

export async function getCachedShows(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
	categoryId: string,
	page: number,
	limit: number,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getShowsCacheTag(playlistId, categoryId, page));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = createXtreamClient(playlist);
	return (await xtream.getShows({
		categoryId,
		page,
		limit,
	})) as unknown as Array<Omit<StandardXtreamShow, "seasons">>;
}

export async function getCachedShow(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
	showId: string,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getShowCacheTag(playlistId, showId));
	cacheTag(getPlaylistParentTag(playlistId));
	return (await getShowSafe(playlist, showId)) as StandardXtreamShow;
}
