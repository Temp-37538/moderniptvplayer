import { getCachedMovie, getCachedShow } from "@/server/cached-content";
import {
	isCategoryAvailableForUser,
	isUnscopedPlaybackAllowed,
} from "@/server/category-access";
import {
	parseCategoryQuery,
	readCategoryIds,
	readEpisodeIds,
} from "@/server/category-preference-policy";
import {
	EXTENSION_PATTERN,
	ID_PATTERN,
	proxyUpstream,
	requireStreamUser,
	streamError,
} from "@/server/stream-proxy";
import {
	createXtreamClient,
	getCachedPlaylistByUserAndId,
} from "@/server/xtream";
import type { NextRequest } from "next/server";

type Context = {
	params: Promise<{ playlistId: string; kind: string; streamId: string }>;
};

// Films and episodes. Seeking relies on the Range header being relayed.
export async function GET(request: NextRequest, { params }: Context) {
	const user = await requireStreamUser();
	if ("response" in user) {
		return user.response;
	}

	const { playlistId, kind, streamId } = await params;
	const extension = request.nextUrl.searchParams.get("ext") ?? "mp4";
	if (
		(kind !== "movie" && kind !== "episode") ||
		!ID_PATTERN.test(playlistId) ||
		!ID_PATTERN.test(streamId) ||
		!EXTENSION_PATTERN.test(extension)
	) {
		return streamError(400, "Invalid stream.");
	}

	const playlist = await getCachedPlaylistByUserAndId(user.userId, playlistId);
	if (!playlist) {
		return streamError(404, "Playlist not found.");
	}

	const categoryKind = kind === "movie" ? "movie" : "series";
	const category = parseCategoryQuery(
		request.nextUrl.searchParams.get("category"),
	);
	const show = parseCategoryQuery(request.nextUrl.searchParams.get("show"));
	if (!category.ok || !show.ok) {
		return streamError(400, "Invalid stream.");
	}
	const restricted = !(await isUnscopedPlaybackAllowed(
		user.userId,
		playlistId,
		categoryKind,
	));
	if (!category.categoryId) {
		if (restricted) {
			return streamError(404, "Category not available.");
		}
	} else {
		const categoryAllowed = await isCategoryAvailableForUser(
			user.userId,
			playlistId,
			categoryKind,
			[category.categoryId],
			[category.categoryId],
		);
		if (!categoryAllowed) {
			return streamError(404, "Category not available.");
		}
		if (restricted && kind === "movie") {
			let movie: unknown;
			try {
				movie = await getCachedMovie(playlistId, undefined, streamId);
			} catch {
				return streamError(404, "Category not available.");
			}
			if (!movie) {
				return streamError(404, "Category not available.");
			}
			const itemAllowed = await isCategoryAvailableForUser(
				user.userId,
				playlistId,
				"movie",
				[category.categoryId, ...readCategoryIds(movie)],
				[category.categoryId],
			);
			if (!itemAllowed) {
				return streamError(404, "Category not available.");
			}
		}
		if (restricted && kind === "episode") {
			if (!show.categoryId) {
				return streamError(404, "Category not available.");
			}
			let series: unknown;
			try {
				series = await getCachedShow(playlistId, undefined, show.categoryId);
			} catch {
				return streamError(404, "Category not available.");
			}
			if (!series || !readEpisodeIds(series).includes(streamId)) {
				return streamError(404, "Category not available.");
			}
			const itemAllowed = await isCategoryAvailableForUser(
				user.userId,
				playlistId,
				"series",
				[category.categoryId, ...readCategoryIds(series)],
				[category.categoryId],
			);
			if (!itemAllowed) {
				return streamError(404, "Category not available.");
			}
		}
	}

	// The upstream URL (with the credentials) is built here, from what is
	// stored for the user: the client only ever names an item.
	const upstreamUrl = createXtreamClient(playlist).generateStreamUrl({
		type: kind,
		streamId,
		extension: extension.toLowerCase(),
	});
	return proxyUpstream(request, upstreamUrl, {
		userId: user.userId,
		manifest: false,
	});
}
