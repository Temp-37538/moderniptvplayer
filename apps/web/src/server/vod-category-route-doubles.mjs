function state() {
	const current = globalThis.__vodCategoryRouteTest;
	if (!current) {
		throw new Error("VOD route test state is not installed.");
	}
	return current;
}

export const ID_PATTERN = /^[\w-]{1,64}$/;
export const EXTENSION_PATTERN = /^[a-z0-9]{2,5}$/i;

export function streamError(status, message) {
	return Response.json(
		{ error: message },
		{ status, headers: { "Cache-Control": "no-store" } },
	);
}

export async function requireStreamUser() {
	return { userId: state().userId };
}

export async function proxyUpstream(_request, url, options) {
	const current = state();
	current.proxyCalls.push({
		url,
		userId: options.userId,
		manifest: options.manifest,
	});
	return new Response("upstream", { status: 200 });
}

export async function getCachedPlaylistByUserAndId(userId, playlistId) {
	const current = state();
	current.playlistLoads += 1;
	const playlist = current.playlist;
	if (!playlist || playlist.id !== playlistId || userId !== current.userId) {
		return null;
	}
	return playlist;
}

export async function isUnscopedPlaybackAllowed() {
	return state().unscoped;
}

export async function isCategoryAvailableForUser(
	userId,
	playlistId,
	kind,
	categoryIds,
	requiredIds,
) {
	const current = state();
	current.categoryChecks.push({
		userId,
		playlistId,
		kind,
		categoryIds: [...categoryIds],
		requiredIds: [...requiredIds],
	});
	return current.allowCategory(categoryIds, requiredIds);
}

export async function getCachedMovie(playlistId, playlist, movieId) {
	const current = state();
	current.movieLoads += 1;
	current.movieLoad = { playlistId, playlist, movieId };
	if (current.movie === "throw") {
		throw new Error("detail unavailable");
	}
	return current.movie;
}

export async function getCachedShow(playlistId, playlist, showId) {
	const current = state();
	current.showLoads += 1;
	current.showLoad = { playlistId, playlist, showId };
	if (current.show === "throw") {
		throw new Error("detail unavailable");
	}
	return current.show;
}

export async function getCachedCatalogMembership(
	playlistId,
	kind,
	categoryId,
	itemId,
) {
	const current = state();
	current.catalogLoads += 1;
	current.catalogLoad = { playlistId, kind, categoryId, itemId };
	return current.findCatalog(kind, categoryId, itemId);
}

export async function m3uStreamTarget(playlist, itemId) {
	const current = state();
	current.m3uCalls += 1;
	current.m3uLoad = { playlist, itemId };
	return current.m3uTarget;
}

export function createXtreamClient(playlist) {
	const current = state();
	current.xtreamClients += 1;
	current.xtreamPlaylist = playlist;
	return {
		generateStreamUrl(options) {
			current.streamUrls.push(options);
			return `http://upstream.example/${options.type}/${options.streamId}.${options.extension}`;
		},
	};
}
