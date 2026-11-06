"use server";

import {
	formatEpisodeProgressName,
	readPlayableSeasons,
	type PlayableEpisodeRef,
} from "@/lib/series-resume";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedUserId } from "./auth-utils";
import { getCachedShow } from "./cached-content";
import {
	saveManualEpisodeProgress,
	type ManualEpisodeProgress,
} from "./watch-progress";

function isSafePathSegment(value: string): boolean {
	if (value.length < 1 || value.length > 128) {
		return false;
	}
	if (
		value.includes("/") ||
		value.includes("\\") ||
		value.includes("..") ||
		value.includes("#") ||
		value.includes("?") ||
		value.includes("%")
	) {
		return false;
	}
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code < 32 || code === 127) {
			return false;
		}
	}
	return true;
}

function isSafeEpisodeId(value: string): boolean {
	if (value.includes("/") || value.includes("\\") || value.includes("#")) {
		return false;
	}
	if (value.includes("..")) {
		return false;
	}
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code < 32 || code === 127) {
			return false;
		}
	}
	return true;
}

const segmentSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.refine(isSafePathSegment);

const episodeInputSchema = z.object({
	playlistId: segmentSchema,
	showId: segmentSchema,
	categoryId: segmentSchema,
	episodeId: z.string().trim().min(1).max(1024).refine(isSafeEpisodeId),
	watched: z.boolean(),
});

const seasonInputSchema = z.object({
	playlistId: segmentSchema,
	showId: segmentSchema,
	categoryId: segmentSchema,
	seasonId: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.refine((value) => {
			for (const character of value) {
				const code = character.charCodeAt(0);
				if (code < 32 || code === 127) {
					return false;
				}
			}
			return true;
		}),
	watched: z.boolean(),
});

function httpPoster(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	if (!/^https?:\/\//i.test(trimmed) || trimmed.length > 2048) {
		return null;
	}
	return trimmed;
}

async function loadPlayable(playlistId: string, showId: string) {
	let show: Awaited<ReturnType<typeof getCachedShow>>;
	try {
		show = await getCachedShow(playlistId, undefined, showId);
	} catch {
		throw new Error("Show not found");
	}
	if (!show) {
		throw new Error("Show not found");
	}

	const showRecord = show as { name?: unknown; poster?: unknown };
	return {
		playable: readPlayableSeasons(show),
		showName: typeof showRecord.name === "string" ? showRecord.name : "",
		showImage: httpPoster(showRecord.poster),
	};
}

function toManualEpisode(
	showName: string,
	episode: PlayableEpisodeRef,
): ManualEpisodeProgress {
	return {
		id: episode.id,
		name: formatEpisodeProgressName(
			showName,
			episode.seasonName,
			episode.number,
		),
		durationSec: episode.durationSec,
	};
}

async function writeEpisodes(
	input: { playlistId: string; showId: string; categoryId: string },
	showName: string,
	showImage: string | null,
	episodes: PlayableEpisodeRef[],
	watched: boolean,
) {
	const userId = await requireAuthenticatedUserId();
	await saveManualEpisodeProgress(userId, {
		playlistId: input.playlistId,
		showId: input.showId,
		categoryId: input.categoryId,
		showImage,
		episodes: episodes.map((episode) => toManualEpisode(showName, episode)),
		watched,
	});
	revalidatePath("/dashboard", "layout");
}

export async function setEpisodeWatched(input: {
	playlistId: string;
	showId: string;
	categoryId: string;
	episodeId: string;
	watched: boolean;
}): Promise<void> {
	const parsed = episodeInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new Error("Invalid episode");
	}

	await requireAuthenticatedUserId();
	const { playable, showName, showImage } = await loadPlayable(
		parsed.data.playlistId,
		parsed.data.showId,
	);
	const episode = playable.find((item) => item.id === parsed.data.episodeId);
	if (!episode) {
		throw new Error("Episode not found");
	}

	await writeEpisodes(
		parsed.data,
		showName,
		showImage,
		[episode],
		parsed.data.watched,
	);
}

export async function setSeasonWatched(input: {
	playlistId: string;
	showId: string;
	categoryId: string;
	seasonId: string;
	watched: boolean;
}): Promise<void> {
	const parsed = seasonInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new Error("Invalid season");
	}

	await requireAuthenticatedUserId();
	const { playable, showName, showImage } = await loadPlayable(
		parsed.data.playlistId,
		parsed.data.showId,
	);
	const episodes = playable.filter(
		(item) => item.seasonId === parsed.data.seasonId,
	);
	if (episodes.length === 0) {
		throw new Error("Season not found");
	}

	await writeEpisodes(
		parsed.data,
		showName,
		showImage,
		episodes,
		parsed.data.watched,
	);
}
