import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONTINUE_CANDIDATE_FACTOR,
	latestSeriesRows,
	mergeContinueCandidates,
	type ContinueCandidate,
} from "./continue-candidates.ts";
import { seasonWatchActions } from "./season-watch.ts";
import {
	continueWatchingEpisodeId,
	pickResumeEpisode,
	type EpisodeProgressEntry,
} from "./series-resume.ts";

function entry(
	updatedAt: number,
	completed: boolean,
	positionSec = completed ? 100 : 10,
): EpisodeProgressEntry {
	return {
		positionSec,
		durationSec: 100,
		completed,
		updatedAt,
	};
}

function candidate(
	id: string,
	showId: string | null,
	updatedAt: number,
	playlistId = "playlist",
): ContinueCandidate {
	return { id, playlistId, showId, updatedAt };
}

describe("pickResumeEpisode", () => {
	it("resumes the latest unfinished episode", () => {
		assert.deepEqual(
			pickResumeEpisode(["a", "b"], {
				a: entry(1, true),
				b: entry(2, false, 20),
			}),
			{ episodeId: "b", kind: "resume" },
		);
	});

	it("offers the next episode after a finished one", () => {
		assert.deepEqual(
			pickResumeEpisode(["a", "b", "c"], {
				a: entry(2, true),
				b: entry(1, false, 0),
			}),
			{ episodeId: "b", kind: "next" },
		);
	});

	it("skips successors that are already completed", () => {
		assert.deepEqual(
			pickResumeEpisode(["a", "b", "c"], {
				a: entry(3, true),
				b: entry(2, true),
				c: entry(1, false, 5),
			}),
			{ episodeId: "c", kind: "resume" },
		);
	});

	it("starts over when every later episode is finished", () => {
		assert.deepEqual(
			pickResumeEpisode(["a", "b"], {
				a: entry(1, true),
				b: entry(2, true),
			}),
			{ episodeId: "a", kind: "rewatch" },
		);
	});

	it("starts at the first episode when nothing is watched", () => {
		assert.deepEqual(pickResumeEpisode(["a"], {}), {
			episodeId: "a",
			kind: "start",
		});
	});

	it("returns null when the catalog has no episodes", () => {
		assert.equal(pickResumeEpisode([], {}), null);
	});
});

describe("continueWatchingEpisodeId", () => {
	it("hides a series that has not started", () => {
		assert.equal(continueWatchingEpisodeId(["a", "b"], {}), null);
	});

	it("hides a series when nothing unfinished remains", () => {
		assert.equal(
			continueWatchingEpisodeId(["a", "b"], {
				a: entry(1, true),
				b: entry(2, true),
			}),
			null,
		);
	});

	it("returns the next unfinished episode", () => {
		assert.equal(
			continueWatchingEpisodeId(["a", "b"], { a: entry(1, true) }),
			"b",
		);
	});
});

describe("continue watching candidates", () => {
	it("does not let one season of episode rows hide other titles", () => {
		const pool = 12 * CONTINUE_CANDIDATE_FACTOR;
		const bulk = Array.from({ length: pool }, (_, index) =>
			candidate(
				`ep-${String(index).padStart(2, "0")}`,
				"show-1",
				10_000 - index,
			),
		);
		const movies = [0, 1, 2].map((index) =>
			candidate(`movie-${index}`, null, 100 - index),
		);
		const otherShow = candidate("ep-other", "show-2", 50);
		const merged = mergeContinueCandidates(
			movies,
			latestSeriesRows([...bulk, otherShow]),
			pool,
		);

		assert.equal(merged.filter((row) => row.showId === "show-1").length, 1);
		assert.equal(merged.filter((row) => row.showId === "show-2").length, 1);
		assert.equal(merged.filter((row) => row.showId === null).length, 3);
		assert.equal(merged.find((row) => row.showId === "show-1")?.id, "ep-00");
	});

	it("breaks an equal timestamp by the greater id", () => {
		const rows = latestSeriesRows([
			candidate("a", "show-1", 5),
			candidate("b", "show-1", 5),
		]);
		assert.deepEqual(
			rows.map((row) => row.id),
			["b"],
		);
	});

	it("keeps the same show on two playlists as two series", () => {
		const rows = latestSeriesRows([
			candidate("a", "show-1", 5, "playlist-a"),
			candidate("b", "show-1", 4, "playlist-b"),
		]);
		assert.equal(rows.length, 2);
	});

	it("still caps the merged window at the candidate pool", () => {
		const shows = Array.from({ length: 6 }, (_, index) =>
			candidate(`show-row-${index}`, `show-${index}`, 1_000 - index),
		);
		const merged = mergeContinueCandidates(
			[candidate("movie-0", null, 1)],
			latestSeriesRows(shows),
			4,
		);
		assert.equal(merged.length, 4);
		assert.equal(
			merged.some((row) => row.id === "movie-0"),
			false,
		);
	});
});

describe("seasonWatchActions", () => {
	it("returns no action when the season has no episodes", () => {
		assert.deepEqual(seasonWatchActions([], {}), []);
	});

	it("offers mark watched when nothing in the season is complete", () => {
		assert.deepEqual(seasonWatchActions([{ id: "a" }], {}), [
			{ watched: true, label: "Mark watched" },
		]);
	});

	it("offers mark unwatched when every episode is complete", () => {
		assert.deepEqual(
			seasonWatchActions([{ id: "a" }], { a: { completed: true } }),
			[{ watched: false, label: "Mark unwatched" }],
		);
	});

	it("offers both actions when the season is partly watched", () => {
		assert.deepEqual(
			seasonWatchActions([{ id: "a" }, { id: "b" }], {
				a: { completed: true },
			}),
			[
				{ watched: true, label: "Mark watched" },
				{ watched: false, label: "Mark unwatched" },
			],
		);
	});
});
