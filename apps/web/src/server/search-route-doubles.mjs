function state() {
	const current = globalThis.__searchRouteTest;
	if (!current) {
		throw new Error("Search route test state is not installed.");
	}
	return current;
}

export const NextResponse = {
	json(body, init) {
		return Response.json(body, init);
	},
};

export function after(task) {
	state().afterTasks.push(task);
}

export async function requireAuthenticatedUserId() {
	return state().userId;
}

export function checkRateLimit(key, limit, windowMs) {
	const current = state();
	current.rateLimitCalls.push({ key, limit, windowMs });
	return current.rateLimit;
}

export async function getPlaylistById(playlistId) {
	const current = state();
	if (current.playlistError) {
		throw current.playlistError;
	}
	return current.playlist && current.playlist.id === playlistId
		? current.playlist
		: null;
}

export async function loadCatalogSearchRules(playlistId) {
	const current = state();
	current.rulesLoads.push(playlistId);
	return current.rules;
}

export async function ensureCatalog(userId, playlistId) {
	const current = state();
	current.ensureCalls.push({ userId, playlistId });
	return current.catalog;
}

export async function syncCatalog(userId, playlistId) {
	state().syncCalls.push({ userId, playlistId });
}

export async function searchCatalog(input) {
	const current = state();
	current.searchCalls.push(input);
	if (current.searchError) {
		throw current.searchError;
	}
	return current.searchResults(input);
}
