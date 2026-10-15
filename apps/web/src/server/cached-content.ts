import "server-only";
import type {
	StandardXtreamCategory,
	StandardXtreamChannel,
	StandardXtreamMovie,
	StandardXtreamMovieListing,
	StandardXtreamShow,
} from "@iptv/xtream-api/standardized";
import { cacheLife, cacheTag } from "next/cache";
import { requireAuthenticatedUserId } from "@/server/auth-utils";
import {
	createXtreamClient,
	getCachedPlaylistByUserAndId,
	getShowSafe,
} from "@/server/xtream";

/**
 * @deprecated Kept so existing call sites keep compiling. Credentials are now
 * resolved server-side from `playlistId`, so they never become part of a
 * `use cache` key or value. The argument is ignored.
 */
type LegacyPlaylistArgument = {
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

async function resolvePlaylist(userId: string, playlistId: string) {
	const playlist = await getCachedPlaylistByUserAndId(userId, playlistId);
	if (!playlist) {
		throw new Error("Playlist not found");
	}
	return playlist;
}

async function resolveClient(userId: string, playlistId: string) {
	return createXtreamClient(await resolvePlaylist(userId, playlistId));
}

// Cached functions only receive non-secret arguments (user and playlist ids):
// their arguments are part of the cache key and their results are persisted.

async function loadMovieCategories(userId: string, playlistId: string) {
	"use cache";
	cacheLife("hours");
	cacheTag(getMovieCategoriesCacheTag(playlistId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	const categories = await xtream.getMovieCategories();
	return categories as StandardXtreamCategory[];
}

async function loadSeriesCategories(userId: string, playlistId: string) {
	"use cache";
	cacheLife("hours");
	cacheTag(getSeriesCategoriesCacheTag(playlistId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	const categories = await xtream.getShowCategories();
	return categories as StandardXtreamCategory[];
}

async function loadChannelCategories(userId: string, playlistId: string) {
	"use cache";
	cacheLife("hours");
	cacheTag(getChannelCategoriesCacheTag(playlistId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	const categories = await xtream.getChannelCategories();
	return categories as StandardXtreamCategory[];
}

async function loadChannels(
	userId: string,
	playlistId: string,
	categoryId: string,
	page: number,
	limit: number,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getChannelsCacheTag(playlistId, categoryId, page));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	return (await xtream.getChannels({
		categoryId,
		page,
		limit,
	})) as StandardXtreamChannel[];
}

async function loadChannel(
	userId: string,
	playlistId: string,
	categoryId: string,
	channelId: string,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getChannelCacheTag(playlistId, channelId));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	return (await xtream.getChannel({
		categoryId,
		channelId,
	})) as StandardXtreamChannel | null;
}

async function loadMovies(
	userId: string,
	playlistId: string,
	categoryId: string,
	page: number,
	limit: number,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getMoviesCacheTag(playlistId, categoryId, page));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	return (await xtream.getMovies({
		categoryId,
		page,
		limit,
	})) as StandardXtreamMovieListing[];
}

async function loadMovie(
	userId: string,
	playlistId: string,
	movieId: string,
): Promise<StandardXtreamMovie | null> {
	"use cache";
	cacheLife("hours");
	cacheTag(getMovieCacheTag(playlistId, movieId));
	cacheTag(getPlaylistParentTag(playlistId));

	const xtream = await resolveClient(userId, playlistId);

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

async function loadShows(
	userId: string,
	playlistId: string,
	categoryId: string,
	page: number,
	limit: number,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getShowsCacheTag(playlistId, categoryId, page));
	cacheTag(getPlaylistParentTag(playlistId));
	const xtream = await resolveClient(userId, playlistId);
	return (await xtream.getShows({
		categoryId,
		page,
		limit,
	})) as unknown as Array<Omit<StandardXtreamShow, "seasons">>;
}

async function loadShow(userId: string, playlistId: string, showId: string) {
	"use cache";
	cacheLife("hours");
	cacheTag(getShowCacheTag(playlistId, showId));
	cacheTag(getPlaylistParentTag(playlistId));
	const playlist = await resolvePlaylist(userId, playlistId);
	return (await getShowSafe(playlist, showId)) as StandardXtreamShow;
}

export async function getCachedMovieCategories(
	playlistId: string,
	_playlist?: LegacyPlaylistArgument,
) {
	return loadMovieCategories(await requireAuthenticatedUserId(), playlistId);
}

export async function getCachedSeriesCategories(
	playlistId: string,
	_playlist?: LegacyPlaylistArgument,
) {
	return loadSeriesCategories(await requireAuthenticatedUserId(), playlistId);
}

export async function getCachedChannelCategories(
	playlistId: string,
	_playlist?: LegacyPlaylistArgument,
) {
	return loadChannelCategories(await requireAuthenticatedUserId(), playlistId);
}

export async function getCachedChannels(
	playlistId: string,
	_playlist: LegacyPlaylistArgument | undefined,
	categoryId: string,
	page: number,
	limit: number,
) {
	return loadChannels(
		await requireAuthenticatedUserId(),
		playlistId,
		categoryId,
		page,
		limit,
	);
}

export async function getCachedChannel(
	playlistId: string,
	_playlist: LegacyPlaylistArgument | undefined,
	categoryId: string,
	channelId: string,
) {
	return loadChannel(
		await requireAuthenticatedUserId(),
		playlistId,
		categoryId,
		channelId,
	);
}

export async function getCachedMovies(
	playlistId: string,
	_playlist: LegacyPlaylistArgument | undefined,
	categoryId: string,
	page: number,
	limit: number,
) {
	return loadMovies(
		await requireAuthenticatedUserId(),
		playlistId,
		categoryId,
		page,
		limit,
	);
}

export async function getCachedMovie(
	playlistId: string,
	_playlist: LegacyPlaylistArgument | undefined,
	movieId: string,
): Promise<StandardXtreamMovie | null> {
	return loadMovie(await requireAuthenticatedUserId(), playlistId, movieId);
}

export async function getCachedShows(
	playlistId: string,
	_playlist: LegacyPlaylistArgument | undefined,
	categoryId: string,
	page: number,
	limit: number,
) {
	return loadShows(
		await requireAuthenticatedUserId(),
		playlistId,
		categoryId,
		page,
		limit,
	);
}

export async function getCachedShow(
	playlistId: string,
	_playlist: LegacyPlaylistArgument | undefined,
	showId: string,
) {
	return loadShow(await requireAuthenticatedUserId(), playlistId, showId);
}
