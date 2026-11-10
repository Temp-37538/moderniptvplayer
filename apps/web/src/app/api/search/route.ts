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

// The catalogue sync runs through after() in this same invocation, so the
// route needs the Vercel Hobby maximum (fluid compute). Must equal
// SYNC_FUNCTION_MAX_MS in server/catalog-index-policy.ts; Next only reads a
// literal here.
export const maxDuration = 300;

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

function unavailableResponse(
	stale: boolean,
	syncedAt: Date | null,
	retryAfterMs: number,
) {
	const retryAfter = Math.ceil(retryAfterMs / 1000);
	return NextResponse.json(
		{ ...emptyResponse("unavailable", stale, syncedAt), retryAfter },
		{
			status: 503,
			headers:
				retryAfter > 0 ? { "Retry-After": String(retryAfter) } : undefined,
		},
	);
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

	const { playlistId, q, kind, limit, retry } = parsed.data;
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

		const state = await ensureCatalog(
			userId,
			playlistId,
			retry ? "retry" : "auto",
		);
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
			return unavailableResponse(
				state.stale,
				state.syncedAt,
				state.retryAfterMs,
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
