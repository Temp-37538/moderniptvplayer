import "server-only";
import {
	getCachedCatalogMembership,
	getCachedChannel,
	getCachedChannelCategories,
	getCachedMovie,
	getCachedMovieCategories,
	getCachedSeriesCategories,
	getCachedShow,
} from "@/server/cached-content";
import prisma from "@moderniptvplayer/db";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAuthenticatedUserId } from "./auth-utils";
import { getCategoryCounts } from "./catalog-lookups";
import type { CatalogKind } from "./catalog-index-policy";
import {
	categoryTargetFromItemUrl,
	isAdultCategoryName,
	isCategorySetBlocked,
	isItemOpenFromCategory,
	itemOpenAllowed,
	matchesPreferenceScope,
	partitionCategories,
	preferenceScopeWhere,
	readCategoryIds,
	unscopedPlaybackAllowed,
	type CategoryKind,
	type CategoryPreferenceRow,
	type NamedCategory,
	type SavedItemTarget,
} from "./category-preference-policy";

export type CategoryBrowserData = {
	playlistName: string;
	categories: Array<NamedCategory & { pinned: boolean; count?: number }>;
	hiddenCategories: Array<NamedCategory & { pinned: boolean }>;
	lockAdultCategories: boolean;
};

type BlockState = {
	owned: boolean;
	lockAdultCategories: boolean;
	hasHiddenCategory: boolean;
	hiddenIds: Set<string>;
	namesById: Map<string, string>;
	rows: CategoryPreferenceRow[];
};

const emptyState = (): BlockState => ({
	owned: false,
	lockAdultCategories: false,
	hasHiddenCategory: false,
	hiddenIds: new Set(),
	namesById: new Map(),
	rows: [],
});

async function loadCatalog(playlistId: string, kind: CategoryKind) {
	switch (kind) {
		case "channel":
			return getCachedChannelCategories(playlistId);
		case "movie":
			return getCachedMovieCategories(playlistId);
		case "series":
			return getCachedSeriesCategories(playlistId);
	}
}

const loadBlockState = cache(
	async (
		userId: string,
		playlistId: string,
		kind: CategoryKind,
	): Promise<BlockState> => {
		const playlist = await prisma.playlist.findFirst({
			where: { id: playlistId, userId },
			select: { id: true },
		});
		if (!playlist) {
			return emptyState();
		}

		const scope = { userId, playlistId, kind };
		const [safety, stored] = await Promise.all([
			prisma.userSafetyPreference.findUnique({
				where: { userId },
				select: { lockAdultCategories: true },
			}),
			prisma.categoryPreference.findMany({
				where: preferenceScopeWhere(scope),
				select: {
					userId: true,
					playlistId: true,
					kind: true,
					categoryId: true,
					pinned: true,
					hidden: true,
				},
			}),
		]);

		const rows = stored.filter((row) => matchesPreferenceScope(row, scope));
		const hiddenIds = new Set(
			rows.filter((row) => row.hidden).map((row) => row.categoryId),
		);
		const lockAdultCategories = safety?.lockAdultCategories ?? false;
		const namesById = new Map<string, string>();
		if (lockAdultCategories) {
			try {
				const catalog = await loadCatalog(playlistId, kind);
				for (const category of catalog) {
					namesById.set(String(category.id), String(category.name ?? ""));
				}
			} catch {
				// Names stay empty, so a required category cannot be proved safe.
			}
		}

		return {
			owned: true,
			lockAdultCategories,
			hasHiddenCategory: hiddenIds.size > 0,
			hiddenIds,
			namesById,
			rows,
		};
	},
);

export async function isCategoryAvailableForUser(
	userId: string,
	playlistId: string,
	kind: CategoryKind,
	categoryIds: readonly string[],
	requiredIds: readonly string[],
) {
	const state = await loadBlockState(userId, playlistId, kind);
	if (!state.owned) {
		return false;
	}
	return !isCategorySetBlocked({
		categoryIds,
		namesById: state.namesById,
		hiddenIds: state.hiddenIds,
		lockAdultCategories: state.lockAdultCategories,
		requiredIds: new Set(requiredIds),
	});
}

export async function isUnscopedPlaybackAllowed(
	userId: string,
	playlistId: string,
	kind: CategoryKind,
) {
	const state = await loadBlockState(userId, playlistId, kind);
	if (!state.owned) {
		return false;
	}
	return unscopedPlaybackAllowed(state);
}

export async function assertCategoryAvailable(
	playlistId: string,
	kind: CategoryKind,
	categoryId: string,
	extraCategoryIds: readonly string[] = [],
) {
	const userId = await requireAuthenticatedUserId();
	const categoryIds = [
		categoryId,
		...extraCategoryIds.filter((id) => id && id !== categoryId),
	];
	const allowed = await isCategoryAvailableForUser(
		userId,
		playlistId,
		kind,
		categoryIds,
		[categoryId],
	);
	if (!allowed) {
		notFound();
	}
}

/**
 * A film or show page, opened from the category named in its URL. The URL is
 * not membership: when the account hides a category or locks adult ones, the
 * title must really be listed in the category it was opened from, and the
 * adult lock sees every real category of the title. Accounts without any
 * restriction keep the plain check, since nothing can be bypassed there.
 */
export async function assertItemInCategory(
	playlistId: string,
	kind: "movie" | "series",
	categoryId: string,
	itemId: string,
	item: unknown,
) {
	const userId = await requireAuthenticatedUserId();
	const restricted = !(await isUnscopedPlaybackAllowed(
		userId,
		playlistId,
		kind,
	));
	const allowed = await itemOpenAllowed({
		restricted,
		item,
		categoryId,
		loadListing: () =>
			getCachedCatalogMembership(playlistId, kind, categoryId, itemId),
		isAvailable: (categoryIds, requiredIds) =>
			isCategoryAvailableForUser(
				userId,
				playlistId,
				kind,
				categoryIds,
				requiredIds,
			),
	});
	if (!allowed) {
		notFound();
	}
}

export async function prepareCategorySearch(
	playlistId: string,
	kind: CategoryKind,
	categoryId: string,
): Promise<
	| { allowed: false }
	| { allowed: true; keep: (itemCategoryIds: readonly string[]) => boolean }
> {
	const userId = await requireAuthenticatedUserId();
	const state = await loadBlockState(userId, playlistId, kind);
	if (!state.owned) {
		return { allowed: false };
	}
	const requestedBlocked = isCategorySetBlocked({
		categoryIds: [categoryId],
		namesById: state.namesById,
		hiddenIds: state.hiddenIds,
		lockAdultCategories: state.lockAdultCategories,
		requiredIds: new Set([categoryId]),
	});
	if (requestedBlocked) {
		return { allowed: false };
	}
	return {
		allowed: true,
		keep: (itemCategoryIds: readonly string[]) =>
			isItemOpenFromCategory({
				requestedCategoryId: categoryId,
				itemCategoryIds,
				namesById: state.namesById,
				hiddenIds: state.hiddenIds,
				lockAdultCategories: state.lockAdultCategories,
			}),
	};
}

/**
 * Drop titles whose other categories are adult while the lock is on.
 * Hidden siblings stay, because the page category was already allowed.
 * Uses ids already present on the listing row.
 */
export async function filterBrowsableItems<T>(
	playlistId: string,
	kind: CategoryKind,
	categoryId: string,
	items: readonly T[],
): Promise<T[]> {
	const userId = await requireAuthenticatedUserId();
	const state = await loadBlockState(userId, playlistId, kind);
	if (!state.owned || !state.lockAdultCategories) {
		return [...items];
	}
	return items.filter((item) =>
		isItemOpenFromCategory({
			requestedCategoryId: categoryId,
			itemCategoryIds: readCategoryIds(item),
			namesById: state.namesById,
			hiddenIds: state.hiddenIds,
			lockAdultCategories: true,
		}),
	);
}

export async function loadCatalogSearchRules(playlistId: string): Promise<{
	hidden: Record<CatalogKind, ReadonlySet<string>>;
	adult: Record<CatalogKind, ReadonlySet<string>>;
} | null> {
	const userId = await requireAuthenticatedUserId();
	const [channel, movie, series] = await Promise.all([
		loadBlockState(userId, playlistId, "channel"),
		loadBlockState(userId, playlistId, "movie"),
		loadBlockState(userId, playlistId, "series"),
	]);
	if (!channel.owned || !movie.owned || !series.owned) {
		return null;
	}

	const adultIds = (state: BlockState) =>
		state.lockAdultCategories
			? new Set(
					[...state.namesById]
						.filter(([, name]) => isAdultCategoryName(name))
						.map(([id]) => id),
				)
			: new Set<string>();

	return {
		hidden: {
			channel: channel.hiddenIds,
			movie: movie.hiddenIds,
			series: series.hiddenIds,
		},
		adult: {
			channel: adultIds(channel),
			movie: adultIds(movie),
			series: adultIds(series),
		},
	};
}

const LIST_LOOKUP_CONCURRENCY = 4;

async function loadSavedCategoryIds(
	target: SavedItemTarget,
): Promise<readonly string[] | null> {
	try {
		if (target.kind === "movie") {
			const movie = await getCachedMovie(
				target.playlistId,
				undefined,
				target.itemId,
			);
			return movie ? readCategoryIds(movie) : null;
		}
		if (target.kind === "series") {
			const show = await getCachedShow(
				target.playlistId,
				undefined,
				target.itemId,
			);
			return show ? readCategoryIds(show) : null;
		}
		const channel = await getCachedChannel(
			target.playlistId,
			undefined,
			target.categoryId,
			target.itemId,
		);
		return channel ? readCategoryIds(channel) : null;
	} catch {
		return null;
	}
}

export async function isListedItemVisible(itemUrl: string): Promise<boolean> {
	const target = categoryTargetFromItemUrl(itemUrl);
	if (!target) {
		return true;
	}
	const userId = await requireAuthenticatedUserId();
	const state = await loadBlockState(userId, target.playlistId, target.kind);
	if (!state.owned) {
		return false;
	}
	if (state.hiddenIds.has(target.categoryId)) {
		return false;
	}
	if (!state.lockAdultCategories) {
		return true;
	}
	const itemCategoryIds = await loadSavedCategoryIds(target);
	if (!itemCategoryIds) {
		return false;
	}
	return isItemOpenFromCategory({
		requestedCategoryId: target.categoryId,
		itemCategoryIds,
		namesById: state.namesById,
		hiddenIds: state.hiddenIds,
		lockAdultCategories: true,
	});
}

/** Remove saved rows that would open a hidden or adult-locked category. */
export async function filterListedItems<T extends { itemUrl: string }>(
	items: readonly T[],
): Promise<T[]> {
	const visible: Array<T | null> = new Array(items.length);
	let cursor = 0;

	async function worker() {
		while (cursor < items.length) {
			const index = cursor;
			cursor += 1;
			const item = items[index];
			if (!item) {
				continue;
			}
			visible[index] = (await isListedItemVisible(item.itemUrl)) ? item : null;
		}
	}

	const workers = Math.min(LIST_LOOKUP_CONCURRENCY, items.length);
	await Promise.all(Array.from({ length: workers }, () => worker()));
	return visible.filter((item): item is T => item !== null);
}

export async function loadCategoryBrowser(
	playlistId: string,
	kind: CategoryKind,
): Promise<CategoryBrowserData | null> {
	const userId = await requireAuthenticatedUserId();
	const playlist = await prisma.playlist.findFirst({
		where: { id: playlistId, userId },
		select: { playlistName: true },
	});
	if (!playlist) {
		return null;
	}

	const [catalog, state, counts] = await Promise.all([
		loadCatalog(playlistId, kind),
		loadBlockState(userId, playlistId, kind),
		getCategoryCounts(playlistId, kind),
	]);
	const named = catalog.map((category) => ({
		id: String(category.id),
		name: String(category.name ?? ""),
	}));
	const partitioned = partitionCategories(
		named,
		state.rows,
		{ userId, playlistId, kind },
		state.lockAdultCategories,
	);
	return {
		playlistName: playlist.playlistName,
		categories: counts
			? partitioned.visible.map((category) => ({
					...category,
					count: counts[category.id] ?? 0,
				}))
			: partitioned.visible,
		hiddenCategories: partitioned.hidden,
		lockAdultCategories: state.lockAdultCategories,
	};
}
