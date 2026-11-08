import { z } from "zod";

export const searchQuerySchema = z.object({
	playlistId: z.string().trim().min(1),
	categoryId: z.string().trim().min(1),
	q: z.string().trim().min(2),
	limit: z.coerce.number().int().min(1).max(20).default(20),
	maxPages: z.coerce.number().int().min(1).max(40).default(20),
});

export const globalSearchQuerySchema = z.object({
	playlistId: z
		.string()
		.trim()
		.regex(/^[\w-]{1,64}$/),
	q: z.string().trim().min(2).max(64),
	kind: z.enum(["all", "channel", "movie", "series"]).default("all"),
	limit: z.coerce.number().int().min(1).max(30).default(20),
});
