import { z } from "zod";

export const searchQuerySchema = z.object({
	playlistId: z.string().trim().min(1),
	categoryId: z.string().trim().min(1),
	q: z.string().trim().min(2),
	limit: z.coerce.number().int().min(1).max(20).default(20),
	maxPages: z.coerce.number().int().min(1).max(40).default(20),
});