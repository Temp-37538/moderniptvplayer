import "server-only";
import prisma from "@moderniptvplayer/db";
import { cacheLife } from "next/cache";
import type { CatalogKind } from "./catalog-index-policy";

// Read-only lookups in the search index (`catalog_entry`). They only answer
// once a sync has finished for the playlist; until then they return nothing
// and callers render without the extra detail. Callers check ownership.

async function readActiveSyncId(playlistId: string) {
	const rows = await prisma.$queryRawUnsafe<
		Array<{ activeSyncId: string | null }>
	>(
		`SELECT "activeSyncId" FROM "catalog_sync" WHERE "playlistId" = $1 LIMIT 1`,
		playlistId,
	);
	return rows[0]?.activeSyncId ?? null;
}

async function countByCategory(
	playlistId: string,
	syncId: string,
	kind: CatalogKind,
): Promise<Record<string, number>> {
	"use cache";
	// A sync id never changes content, so the key itself expires the entry.
	cacheLife("hours");
	const rows = await prisma.$queryRawUnsafe<
		Array<{ categoryId: string; count: number }>
	>(
		`SELECT category AS "categoryId", COUNT(*)::int AS "count"
		 FROM "catalog_entry", unnest("categoryIds") AS category
		 WHERE "playlistId" = $1 AND "syncId" = $2 AND "kind" = $3
		 GROUP BY category`,
		playlistId,
		syncId,
		kind,
	);
	return Object.fromEntries(rows.map((row) => [row.categoryId, row.count]));
}

/** Items per category id, or null while the playlist has no index yet. */
export async function getCategoryCounts(
	playlistId: string,
	kind: CatalogKind,
): Promise<Record<string, number> | null> {
	try {
		const syncId = await readActiveSyncId(playlistId);
		return syncId ? await countByCategory(playlistId, syncId, kind) : null;
	} catch {
		return null;
	}
}

export const catalogImageKey = (kind: string, itemId: string) =>
	`${kind}:${itemId}`;

/** Poster or logo per `kind:itemId`, for the items the index knows. */
export async function getCatalogImages(
	playlistId: string,
	items: ReadonlyArray<{ itemType: string; itemId: string }>,
): Promise<Map<string, string>> {
	const images = new Map<string, string>();
	if (items.length === 0) {
		return images;
	}
	try {
		const syncId = await readActiveSyncId(playlistId);
		if (!syncId) {
			return images;
		}
		const rows = await prisma.$queryRawUnsafe<
			Array<{ kind: string; itemId: string; image: string | null }>
		>(
			`SELECT "kind", "itemId", "image" FROM "catalog_entry"
			 WHERE "playlistId" = $1 AND "syncId" = $2
			   AND "itemId" = ANY($3::text[]) AND "image" IS NOT NULL`,
			playlistId,
			syncId,
			[...new Set(items.map((item) => item.itemId))],
		);
		for (const row of rows) {
			if (row.image) {
				images.set(catalogImageKey(row.kind, row.itemId), row.image);
			}
		}
	} catch {
		// No thumbnails is fine: the rows still render.
	}
	return images;
}
