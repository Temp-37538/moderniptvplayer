import {
	getCachedCatalogMembership,
	getCachedMovie,
	getCachedShow,
} from "@/server/cached-content";
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
import { m3uStreamTarget } from "@/server/m3u-catalog";
import {
	createXtreamClient,
	getCachedPlaylistByUserAndId,
} from "@/server/xtream";
import type { NextRequest } from "next/server";

type Context = {
	params: Promise<{ playlistId: string; kind: string; streamId: string }>;
};

/**
 * Detail category ids are authoritative when they exist. An empty detail, or
 * a movie detail the serializer cannot read, is membership only when one
 * category-scoped catalog row exists. The returned ids are every real
 * category the adult lock must see. `null` denies the request.
 */
async function provenCategoryIds(
	detail: unknown,
	requestedCategoryId: string,
	loadListing: () => Promise<unknown>,
): Promise<readonly string[] | null> {
	const detailIds = readCategoryIds(detail);
	if (detailIds.includes(requestedCategoryId)) {
		return detailIds;
	}
	if (detailIds.length > 0) {
		return null;
	}
	let listed: unknown;
	try {
		listed = await loadListing();
	} catch {
		return null;
	}
	if (!listed) {
		return null;
	}
	const listedIds = readCategoryIds(listed);
	if (listedIds.includes(requestedCategoryId)) {
		return listedIds;
	}
	return [requestedCategoryId, ...listedIds];
}

async function itemCategoryPermitted(
	userId: string,
	playlistId: string,
	kind: "movie" | "episode",
	streamId: string,
	requestedCategoryId: string,
	showId: string | null,
) {
	const catalogKind = kind === "movie" ? "movie" : "series";
	let detail: unknown = null;
	let membershipId = streamId;
	if (kind === "episode") {
		if (!showId) {
			return false;
		}
		membershipId = showId;
		try {
			detail = await getCachedShow(playlistId, undefined, showId);
		} catch {
			return false;
		}
		// The episode id is the upstream stream id. It must belong to this show.
		if (!detail || !readEpisodeIds(detail).includes(streamId)) {
			return false;
		}
	} else {
		try {
			detail = await getCachedMovie(playlistId, undefined, streamId);
		} catch {
			// The movie detail serializer throws when category metadata is absent.
			// Membership then comes from the category listing row.
			detail = null;
		}
	}
	const categoryIds = await provenCategoryIds(detail, requestedCategoryId, () =>
		getCachedCatalogMembership(
			playlistId,
			catalogKind,
			requestedCategoryId,
			membershipId,
		),
	);
	if (!categoryIds) {
		return false;
	}
	return isCategoryAvailableForUser(
		userId,
		playlistId,
		catalogKind,
		categoryIds,
		[requestedCategoryId],
	);
}

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
	const requestedCategoryId = category.categoryId;
	if (!requestedCategoryId) {
		if (restricted) {
			return streamError(404, "Category not available.");
		}
	} else {
		// Hidden and adult names on the opened category apply before any lookup.
		const categoryAllowed = await isCategoryAvailableForUser(
			user.userId,
			playlistId,
			categoryKind,
			[requestedCategoryId],
			[requestedCategoryId],
		);
		if (!categoryAllowed) {
			return streamError(404, "Category not available.");
		}
		// A visible category id in the query is not membership. Prove the film
		// or show is actually in it, then apply the adult lock to every real
		// category name. This runs even when nothing is hidden.
		const itemAllowed = await itemCategoryPermitted(
			user.userId,
			playlistId,
			kind,
			streamId,
			requestedCategoryId,
			show.categoryId,
		);
		if (!itemAllowed) {
			return streamError(404, "Category not available.");
		}
	}

	if (playlist.source === "M3U") {
		const expected = kind === "movie" ? "movie" : "series";
		const target = await m3uStreamTarget(playlist, streamId).catch(() => null);
		if (!target || target.kind !== expected) {
			return streamError(404, "Stream not found.");
		}
		return proxyUpstream(request, target.url, {
			userId: user.userId,
			manifest: target.delivery === "hls",
		});
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
