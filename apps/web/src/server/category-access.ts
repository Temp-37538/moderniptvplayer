import "server-only";
import {
	getCachedChannelCategories,
	getCachedMovieCategories,
	getCachedSeriesCategories,
} from "@/server/cached-content";
import prisma from "@moderniptvplayer/db";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAuthenticatedUserId } from "./auth-utils";
import {
	isCategorySetBlocked,
	matchesPreferenceScope,
	partitionCategories,
	preferenceScopeWhere,
	unscopedPlaybackAllowed,
	type CategoryKind,
	type CategoryPreferenceRow,
	type NamedCategory,
} from "./category-preference-policy";

export type CategoryBrowserData = {
	playlistName: string;
	categories: Array<NamedCategory & { pinned: boolean }>;
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

export async function prepareCategorySearch(
	playlistId: string,
	kind: CategoryKind,
	categoryId: string,
): Promise<
	| { allowed: false }
	| { allowed: true; keep: (itemCategoryId: string) => boolean }
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
		keep: (itemCategoryId: string) => {
			if (itemCategoryId === categoryId) {
				return true;
			}
			return !isCategorySetBlocked({
				categoryIds: [itemCategoryId],
				namesById: state.namesById,
				hiddenIds: state.hiddenIds,
				lockAdultCategories: state.lockAdultCategories,
			});
		},
	};
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

	const [catalog, state] = await Promise.all([
		loadCatalog(playlistId, kind),
		loadBlockState(userId, playlistId, kind),
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
		categories: partitioned.visible,
		hiddenCategories: partitioned.hidden,
		lockAdultCategories: state.lockAdultCategories,
	};
}
