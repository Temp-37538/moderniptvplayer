import { getCachedShows } from "@/server/cached-content";
import { prepareCategorySearch } from "@/server/category-access";
import { readCategoryIds } from "@/server/category-preference-policy";
import { searchInCategory } from "@/server/category-search";
import { searchQuerySchema } from "@/server/search-params-schema";
import { getPlaylistById } from "@/server/xtream";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const parsed = searchQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);

	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Invalid search parameters.",
				details: parsed.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const { playlistId, categoryId, q, limit, maxPages } = parsed.data;
	const playlist = await getPlaylistById(playlistId);

	if (!playlist) {
		return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
	}

	const gate = await prepareCategorySearch(playlistId, "series", categoryId);
	if (!gate.allowed) {
		return NextResponse.json(
			{ error: "Category not available." },
			{ status: 404 },
		);
	}

	try {
		const result = await searchInCategory<Omit<StandardXtreamShow, "seasons">>({
			query: q,
			limit,
			maxPages,
			loadPage: ({ page, limit: pageLimit }) =>
				getCachedShows(playlistId, undefined, categoryId, page, pageLimit),
			toSearchItem: (show) => {
				const id = String(show.id ?? "");
				if (!id) {
					return null;
				}
				if (!gate.keep(readCategoryIds(show))) {
					return null;
				}

				return {
					id,
					name: String(show.name ?? ""),
					poster: show.poster || undefined,
					categoryId,
				};
			},
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Failed to search series by category:", error);
		return NextResponse.json(
			{ error: "Unable to search series right now." },
			{ status: 500 },
		);
	}
}
