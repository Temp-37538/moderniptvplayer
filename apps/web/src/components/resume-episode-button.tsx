"use client";

import { requestPlayEpisode } from "@/lib/play-episode";
import type { ReactNode } from "react";

/**
 * The resume button of the series page: it plays the episode (from where it
 * stopped) instead of only scrolling to it. A link to #episode-<id> could not
 * do that: the browser only tells the page about a change of address, and the
 * address is already the same after the first click.
 */
export function ResumeEpisodeButton({
	episodeId,
	className,
	children,
}: {
	episodeId: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			className={className}
			onClick={() => requestPlayEpisode(episodeId)}
		>
			{children}
		</button>
	);
}
