import {
	getCachedMovie,
	getCachedMovies,
	getCachedShow,
	getCachedShows,
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

// Category listings are cached per page. One page is not proof that an id is
// absent: walk pages until the title is found or a short page ends the catalog.
const CATEGORY_LISTING_PAGE_SIZE = 1000;
const CATEGORY_LISTING_MAX_PAGES = 200;

function uniqueIds(groups: readonly (readonly string[])[]): string[] {
	const ids: string[] = [];
	for (const group of groups) {
		for (const id of group) {
			if (id && !ids.includes(id)) {
				ids.push(id);
			}
		}
	}
	return ids;
}

function itemIdOf(value: unknown) {
	if (!value || typeof value !== "object" || !("id" in value)) {
		return "";
	}
	return String((value as { id?: unknown }).id ?? "").trim();
}

function sameItemId(value: unknown, itemId: string) {
	const id = itemIdOf(value);
	return id.length > 0 && id === itemId;
}

function mismatchedItemId(value: unknown, itemId: string) {
	const id = itemIdOf(value);
	return id.length > 0 && id !== itemId;
}

/**
 * Category ids for a title that was found in one category's cached listing.
 * `null` means the title was not in that category, or the listing could not
 * be read. An empty array means the row was found and carries no category ids.
 */
async function listedCategoryIds(
	itemId: string,
	loadPage: (page: number, limit: number) => Promise<unknown>,
): Promise<readonly string[] | null> {
	try {
		for (let page = 1; page <= CATEGORY_LISTING_MAX_PAGES; page += 1) {
			const pageItems = await loadPage(page, CATEGORY_LISTING_PAGE_SIZE);
			if (!Array.isArray(pageItems)) {
				return null;
			}
			for (const item of pageItems) {
				if (!sameItemId(item, itemId)) {
					continue;
				}
				return readCategoryIds(item);
			}
			if (pageItems.length < CATEGORY_LISTING_PAGE_SIZE) {
				return null;
			}
		}
	} catch {
		return null;
	}
	return null;
}

/**
 * The query category is membership only when the detail lists it, or when the
 * detail has no category metadata and the category-scoped catalog contains
 * the title. A different category on the detail is not replaced by the query.
 * The returned ids are the title's real categories and are what the adult
 * lock must see. `null` means the requested category is not a real membership.
 */
async function provenCategoryIds(
	detail: unknown,
	requestedCategoryId: string,
	itemId: string,
	loadPage: (page: number, limit: number) => Promise<unknown>,
): Promise<readonly string[] | null> {
	const detailIds = readCategoryIds(detail);
	if (detailIds.includes(requestedCategoryId)) {
		return detailIds;
	}
	if (detailIds.length > 0) {
		return null;
	}
	const listedIds = await listedCategoryIds(itemId, loadPage);
	if (listedIds === null) {
		return null;
	}
	return uniqueIds([listedIds, [requestedCategoryId]]);
}

async function movieCategoryPermitted(
	userId: string,
	playlistId: string,
	streamId: string,
	requestedCategoryId: string,
) {
	let movie: unknown = null;
	try {
		movie = await getCachedMovie(playlistId, undefined, streamId);
	} catch {
		// Detail serializers omit category metadata on some panels and throw.
		// Membership then has to come from the category listing.
		movie = null;
	}
	const categoryIds = await provenCategoryIds(
		movie,
		requestedCategoryId,
		streamId,
		(page, limit) =>
			getCachedMovies(playlistId, undefined, requestedCategoryId, page, limit),
	);
	if (!categoryIds) {
		return false;
	}
	return isCategoryAvailableForUser(userId, playlistId, "movie", categoryIds, [
		requestedCategoryId,
	]);
}

async function episodeCategoryPermitted(
	userId: string,
	playlistId: string,
	streamId: string,
	requestedCategoryId: string,
	showId: string | null,
) {
	if (!showId) {
		return false;
	}
	let series: unknown = null;
	try {
		series = await getCachedShow(playlistId, undefined, showId);
	} catch {
		return false;
	}
	// The episode id is the upstream stream id. It must belong to this show.
	if (!series || !readEpisodeIds(series).includes(streamId)) {
		return false;
	}
	if (mismatchedItemId(series, showId)) {
		return false;
	}
	const categoryIds = await provenCategoryIds(
		series,
		requestedCategoryId,
		showId,
		(page, limit) =>
			getCachedShows(playlistId, undefined, requestedCategoryId, page, limit),
	);
	if (!categoryIds) {
		return false;
	}
	return isCategoryAvailableForUser(userId, playlistId, "series", categoryIds, [
		requestedCategoryId,
	]);
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
		const itemAllowed =
			kind === "movie"
				? await movieCategoryPermitted(
						user.userId,
						playlistId,
						streamId,
						requestedCategoryId,
					)
				: await episodeCategoryPermitted(
						user.userId,
						playlistId,
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
