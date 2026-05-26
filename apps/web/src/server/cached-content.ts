import "server-only";
import type { StandardXtreamCategory } from "@iptv/xtream-api/standardized";
import { cacheLife, cacheTag } from "next/cache";
import { createXtreamClient } from "@/server/xtream";

type XtreamPlaylistCredentials = {
	serverUrl: string;
	username: string;
	password: string;
};

const getMovieCategoriesCacheTag = (playlistId: string) =>
	`playlist-${playlistId}-movie-categories`;

const getSeriesCategoriesCacheTag = (playlistId: string) =>
	`playlist-${playlistId}-series-categories`;

const getChannelCategoriesCacheTag = (playlistId: string) =>
	`playlist-${playlistId}-channel-categories`;

export const getPlaylistCacheTags = (playlistId: string) =>
	[
		getMovieCategoriesCacheTag(playlistId),
		getSeriesCategoriesCacheTag(playlistId),
		getChannelCategoriesCacheTag(playlistId),
	] as const;

export async function getCachedMovieCategories(
	playlistId: string,
	playlist: XtreamPlaylistCredentials,
) {
	"use cache";
	cacheLife("hours");
	cacheTag(getMovieCategoriesCacheTag(playlistId));
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
	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getChannelCategories();
	return categories as StandardXtreamCategory[];
}
