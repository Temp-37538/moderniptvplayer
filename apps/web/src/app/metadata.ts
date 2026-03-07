import "server-only";
import {
	createXtreamClient,
	getPlaylistById,
	getShowSafe,
} from "@/server/xtream";
import { env } from "@moderniptvplayer/env/server";
import type {
	StandardXtreamCategory,
	StandardXtreamChannel,
	StandardXtreamMovie,
	StandardXtreamShow,
} from "@iptv/xtream-api/standardized";
import type { Metadata } from "next";
import { cache } from "react";

export const APP_NAME = "Modern IPTV Player";
export const APP_DESCRIPTION =
	"Import Xtream Codes, M3U, and Stalker playlists, then browse live TV, movies, and series from a single interface.";
const APP_OG_IMAGE = "/background.png";

type MetadataOptions = {
	title: string;
	description?: string;
	path?: string;
	noIndex?: boolean;
	image?: string;
};

type ContentSection = "channels" | "movies" | "series";

function buildRobots(noIndex: boolean): Metadata["robots"] | undefined {
	if (!noIndex) {
		return undefined;
	}

	return {
		index: false,
		follow: false,
		googleBot: {
			index: false,
			follow: false,
			"max-image-preview": "none",
			"max-snippet": -1,
			"max-video-preview": -1,
		},
	};
}

function resolveMetadataTitle(title: string) {
	return title === APP_NAME ? APP_NAME : `${title} | ${APP_NAME}`;
}

export function createPageMetadata({
	title,
	description = APP_DESCRIPTION,
	path = "/",
	noIndex = false,
	image = APP_OG_IMAGE,
}: MetadataOptions): Metadata {
	const resolvedTitle = resolveMetadataTitle(title);
	const robots = buildRobots(noIndex);

	return {
		title,
		description,
		alternates: {
			canonical: path,
		},
		openGraph: {
			title: resolvedTitle,
			description,
			url: path,
			siteName: APP_NAME,
			type: "website",
			images: [
				{
					url: image,
					alt: resolvedTitle,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: resolvedTitle,
			description,
			images: [image],
		},
		robots,
	};
}

export function getMetadataBase() {
	return new URL(env.BETTER_AUTH_URL);
}

export function humanizeSegment(value: string) {
	return value
		.split(/[-_]/g)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

export function getAuthPageMetadata(path: string): Metadata {
	const titleByPath: Record<string, string> = {
		"sign-in": "Sign In",
		"sign-up": "Create Account",
		"forgot-password": "Reset Password",
		"verify-email": "Verify Email",
	};
	const resolvedTitle = titleByPath[path] ?? humanizeSegment(path);

	return createPageMetadata({
		title: resolvedTitle,
		description: `${resolvedTitle} to access your playlists, favorites, and watch later queue.`,
		path: `/auth/${path}`,
		noIndex: true,
	});
}

export function getAccountPageMetadata(path: string): Metadata {
	const titleByPath: Record<string, string> = {
		settings: "Account Settings",
		security: "Security Settings",
		profile: "Profile Settings",
	};
	const resolvedTitle =
		titleByPath[path] ?? `${humanizeSegment(path)} Settings`;

	return createPageMetadata({
		title: resolvedTitle,
		description: `Manage ${resolvedTitle.toLowerCase()} for your ${APP_NAME} account.`,
		path: `/dashboard/account/${path}`,
		noIndex: true,
	});
}

export const getPlaylistMetadataContext = cache(async (playlistId: string) => {
	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		return null;
	}

	return playlist;
});

async function getSectionCategories(
	section: ContentSection,
	playlist: { serverUrl: string; username: string; password: string },
) {
	const xtream = createXtreamClient(playlist);

	switch (section) {
		case "channels":
			return (await xtream.getChannelCategories()) as StandardXtreamCategory[];
		case "movies":
			return (await xtream.getMovieCategories()) as StandardXtreamCategory[];
		case "series":
			return (await xtream.getShowCategories()) as StandardXtreamCategory[];
	}
}

export const getCategoryMetadataContext = cache(
	async (section: ContentSection, playlistId: string, categoryId: string) => {
		const playlist = await getPlaylistMetadataContext(playlistId);

		if (!playlist) {
			return null;
		}

		try {
			const categories = await getSectionCategories(section, playlist);
			const category = categories.find((entry) => entry.id === categoryId);

			return {
				playlist,
				categoryName: category?.name ?? null,
			};
		} catch {
			return {
				playlist,
				categoryName: null,
			};
		}
	},
);

export const getChannelMetadataContext = cache(
	async (playlistId: string, categoryId: string, channelId: string) => {
		const playlist = await getPlaylistMetadataContext(playlistId);

		if (!playlist) {
			return null;
		}

		try {
			const xtream = createXtreamClient(playlist);
			const channels = (await xtream.getChannels({
				categoryId,
			})) as StandardXtreamChannel[];
			const channel = channels.find((entry) => entry.id === channelId) ?? null;

			return {
				playlist,
				channel,
			};
		} catch {
			return {
				playlist,
				channel: null,
			};
		}
	},
);

export const getMovieMetadataContext = cache(
	async (playlistId: string, movieId: string) => {
		const playlist = await getPlaylistMetadataContext(playlistId);

		if (!playlist) {
			return null;
		}

		try {
			const xtream = createXtreamClient(playlist);
			const movie = (await xtream.getMovie({ movieId })) as StandardXtreamMovie;

			return {
				playlist,
				movie,
			};
		} catch {
			return {
				playlist,
				movie: null,
			};
		}
	},
);

export const getShowMetadataContext = cache(
	async (playlistId: string, showId: string) => {
		const playlist = await getPlaylistMetadataContext(playlistId);

		if (!playlist) {
			return null;
		}

		try {
			const show = (await getShowSafe(playlist, showId)) as StandardXtreamShow;

			return {
				playlist,
				show,
			};
		} catch {
			return {
				playlist,
				show: null,
			};
		}
	},
);
