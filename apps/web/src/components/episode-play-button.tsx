"use client";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { VideoPlayer, type ProgressDetails } from "@/components/video-player";
import { CheckIcon, PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EpisodePlayButtonProps = {
	playlistId: string;
	episodeId: string;
	/** File extension of the episode (mkv, mp4...). */
	extension: string;
	title: string;
	progress: ProgressDetails;
	poster?: string;
	startAt?: number;
	completed?: boolean;
};

export function EpisodePlayButton({
	playlistId,
	episodeId,
	extension,
	title,
	progress,
	poster,
	startAt = 0,
	completed = false,
}: EpisodePlayButtonProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);

	// "Continue watching" links here with #episode-<id>.
	useEffect(() => {
		if (window.location.hash === `#episode-${episodeId}`) {
			setOpen(true);
		}
	}, [episodeId]);

	const ext = extension.toLowerCase();
	return (
		<>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={completed ? "Watch episode again" : "Play episode"}
				title={completed ? "Watched" : startAt > 0 ? "Resume" : "Play"}
				onClick={() => setOpen(true)}
			>
				{completed ? (
					<CheckIcon className="size-4 text-primary" />
				) : (
					<PlayIcon className="size-4" />
				)}
			</Button>
			<Sheet
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (next) {
						return;
					}
					// The player saved where you stopped as it closed: reload the
					// page data so the next play resumes from there.
					setTimeout(() => router.refresh(), 1000);
				}}
			>
				<SheetContent side="bottom" className="mx-auto w-full max-w-4xl pb-6">
					<SheetHeader>
						<SheetTitle className="pr-10">{title}</SheetTitle>
					</SheetHeader>
					<div className="px-4">
						<VideoPlayer
							autoPlay
							poster={poster}
							startAt={completed ? 0 : startAt}
							progress={progress}
							sources={[
								{
									kind: ext === "m3u8" ? "hls" : "native",
									src: `/api/stream/vod/${encodeURIComponent(playlistId)}/episode/${encodeURIComponent(episodeId)}?ext=${encodeURIComponent(ext)}`,
								},
							]}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
