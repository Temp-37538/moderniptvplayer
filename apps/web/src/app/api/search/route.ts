import { loadCatalogSearchRules } from "@/server/category-access";
import { checkRateLimit } from "@/server/rate-limit";
import {
	CATALOG_KINDS,
	parseSearchTokens,
	searchHref,
	type CatalogKind,
} from "@/server/catalog-index-policy";
import {
	ensureCatalog,
	searchCatalog,
	syncCatalog,
} from "@/server/catalog-index";
import { requireAuthenticatedUserId } from "@/server/auth-utils";
import { globalSearchQuerySchema } from "@/server/search-params-schema";
import { getPlaylistById } from "@/server/xtream";
import { after, type NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function emptyResponse(
	status: "building" | "unavailable",
	stale = false,
	syncedAt: Date | null = null,
) {
	return {
		status,
		stale,
		syncedAt: syncedAt?.toISOString() ?? null,
		results: [],
	};
}

export async function GET(request: NextRequest) {
	const parsed = globalSearchQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid search parameters." },
			{ status: 400 },
		);
	}

	const { playlistId, q, kind, limit } = parsed.data;
	const tokens = parseSearchTokens(q);
	if (!tokens) {
		return NextResponse.json(
			{ error: "Invalid search query." },
			{ status: 400 },
		);
	}

	const userId = await requireAuthenticatedUserId();

	try {
		const rateLimit = checkRateLimit(`catalog-search:${userId}`, 30, 60_000);
		if (!rateLimit.allowed) {
			return NextResponse.json(
				{ error: "Too many search requests." },
				{
					status: 429,
					headers: {
						"Retry-After": String(rateLimit.retryAfterSeconds),
					},
				},
			);
		}

		const playlist = await getPlaylistById(playlistId);
		if (!playlist) {
			return NextResponse.json(
				{ error: "Playlist not found." },
				{ status: 404 },
			);
		}

		const rules = await loadCatalogSearchRules(playlistId);
		if (!rules) {
			return NextResponse.json(
				{ error: "Playlist not found." },
				{ status: 404 },
			);
		}

		const state = await ensureCatalog(userId, playlistId);
		if (state.start) {
			after(() => syncCatalog(userId, playlistId));
		}
		if (state.status === "building") {
			return NextResponse.json(
				emptyResponse("building", state.stale, state.syncedAt),
				{ status: 202 },
			);
		}
		if (state.status === "unavailable" || !state.activeSyncId) {
			return NextResponse.json(
				emptyResponse("unavailable", state.stale, state.syncedAt),
				{ status: 503 },
			);
		}

		const kinds: readonly CatalogKind[] =
			kind === "all" ? CATALOG_KINDS : [kind];
		const matches = await searchCatalog({
			playlistId,
			activeSyncId: state.activeSyncId,
			tokens,
			kinds,
			limit,
			hidden: rules.hidden,
			adult: rules.adult,
		});
		const results = matches.map((result) => ({
			...result,
			href: searchHref(result.kind, playlistId, result.categoryId, result.id),
		}));

		return NextResponse.json({
			status: "ready",
			stale: state.stale,
			syncedAt: state.syncedAt?.toISOString() ?? null,
			results,
		});
	} catch (error) {
		console.error(
			"[catalog-search] failed:",
			error instanceof Error ? error.name : "unknown",
		);
		return NextResponse.json(
			{ error: "Unable to search the catalogue right now." },
			{ status: 500 },
		);
	}
}
