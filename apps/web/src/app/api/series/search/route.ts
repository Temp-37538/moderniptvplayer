import { searchInCategory } from "@/server/category-search";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamShow } from "@iptv/xtream-api/standardized";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const searchQuerySchema = z.object({
	playlistId: z.string().trim().min(1),
	categoryId: z.string().trim().min(1),
	q: z.string().trim().min(2),
	limit: z.coerce.number().int().min(1).max(20).default(20),
	maxPages: z.coerce.number().int().min(1).max(40).default(20),
});

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
		const result = await searchInCategory<Omit<StandardXtreamShow, "seasons">>({
			query: q,
			limit,
			maxPages,
			loadPage: async ({ page, limit: pageLimit }) =>
				(await xtream.getShows({
					categoryId,
					page,
					limit: pageLimit,
				})) as unknown as Array<Omit<StandardXtreamShow, "seasons">>,
			toSearchItem: (show) => {
				const id = String(show.id ?? "");
				if (!id) {
					return null;
				}

				return {
					id,
					name: String(show.name ?? ""),
					poster: show.poster || undefined,
					categoryId: String(show.categoryIds?.[0] ?? categoryId),
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
