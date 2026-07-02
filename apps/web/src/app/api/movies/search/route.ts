import { searchInCategory } from "@/server/category-search";
import { searchQuerySchema } from "@/server/search-params-schema";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamMovieListing } from "@iptv/xtream-api/standardized";
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

	const xtream = createXtreamClient(playlist);

	try {
		const result = await searchInCategory<StandardXtreamMovieListing>({
			query: q,
			limit,
			maxPages,
			loadPage: async ({ page, limit: pageLimit }) =>
				(await xtream.getMovies({
					categoryId,
					page,
					limit: pageLimit,
				})) as StandardXtreamMovieListing[],
			toSearchItem: (movie) => {
				const id = String(movie.id ?? "");
				if (!id) {
					return null;
				}

				return {
					id,
					name: String(movie.name ?? ""),
					poster: movie.poster || undefined,
					categoryId: String(movie.categoryIds?.[0] ?? categoryId),
				};
			},
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Failed to search movies by category:", error);
		return NextResponse.json(
			{ error: "Unable to search movies right now." },
			{ status: 500 },
		);
	}
}
