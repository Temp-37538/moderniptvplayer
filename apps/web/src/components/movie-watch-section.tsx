"use client";

import { Button } from "@/components/ui/button";
import { VideoPlayer, type VideoPlayerProps } from "@/components/video-player";
import { formatTimestamp } from "@/lib/series-resume";
import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";

type MovieWatchSectionProps = Omit<VideoPlayerProps, "startAt"> & {
	/** Saved position, in seconds: 0 when there is nothing to resume. */
	resumeAt: number;
	completed: boolean;
};

/** The movie player, with "Start over" next to the resume position. */
export function MovieWatchSection({
	resumeAt,
	completed,
	...playerProps
}: MovieWatchSectionProps) {
	const [fromStart, setFromStart] = useState(false);
	const resuming = resumeAt > 0 && !fromStart;

	return (
		<section className="mt-10 space-y-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="font-serif text-2xl tracking-tight">Watch</h2>
				{resuming ? (
					<div className="flex items-center gap-2">
						<p className="text-xs font-medium text-muted-foreground tabular-nums">
							Resuming at {formatTimestamp(resumeAt)}
						</p>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={() => setFromStart(true)}
						>
							<RotateCcwIcon />
							Start over
						</Button>
					</div>
				) : completed ? (
					<p className="text-xs font-medium text-muted-foreground">Watched</p>
				) : null}
			</div>
			{/* A new key remounts the player, in the browser and in mpv alike. */}
			<VideoPlayer
				key={fromStart ? "start" : "resume"}
				{...playerProps}
				startAt={resuming ? resumeAt : 0}
				autoPlay={fromStart || playerProps.autoPlay}
			/>
		</section>
	);
}
