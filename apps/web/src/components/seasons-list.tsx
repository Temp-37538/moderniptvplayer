"use client";

import { CopyStreamButton } from "@/components/copy-stream-button";
import { ExternalStreamLink } from "@/components/external-stream-link";
import { ChevronDown, Clock } from "lucide-react";
import { useEffect, useState } from "react";

type Episode = {
	durationFormatted?: string;
	id: string;
	number: number;
	plot?: string | null;
	title: string;
	url?: string;
};

type Season = {
	episodes?: Episode[];
	episodeCount: number;
	id: string;
	name: string;
	voteAverage: number;
};

const MOBILE_BREAKPOINT = "(min-width: 640px)";

// This whole block is a client component on purpose. The season toggle needs state,
// and passing render props down from the server page is impossible because RSC
// cannot serialise functions. So the data comes in as plain props instead.
//
// On mobile a long series stacks every episode of every season in one column, so
// seasons start collapsed with only the first one open. From sm up the two-column
// grid is compact enough that hiding episodes behind a click only gets in the way,
// so everything starts open and the headers stop being interactive.
export function SeasonsList({ seasons }: { seasons: Season[] }) {
	const [openSeasons, setOpenSeasons] = useState<Set<string>>(
		() => new Set(seasons.map((season) => season.id)),
	);
	const [isDesktop, setIsDesktop] = useState(true);

	useEffect(() => {
		const query = window.matchMedia(MOBILE_BREAKPOINT);

		const sync = () => {
			setIsDesktop(query.matches);
			setOpenSeasons(
				query.matches
					? new Set(seasons.map((season) => season.id))
					: new Set(seasons[0] ? [seasons[0].id] : []),
			);
		};

		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, [seasons]);

	function toggle(id: string) {
		if (isDesktop) {
			return;
		}

		setOpenSeasons((previous) => {
			const next = new Set(previous);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	return (
		<div className="mt-12 space-y-6 sm:space-y-12">
			{seasons.map((season) => {
				const isOpen = openSeasons.has(season.id);

				return (
					<section key={season.id}>
						<button
							type="button"
							aria-expanded={isOpen}
							disabled={isDesktop}
							onClick={() => toggle(season.id)}
							className="flex w-full cursor-pointer flex-wrap items-baseline justify-between gap-3 border-b border-border/50 pb-3 text-left disabled:cursor-default"
						>
							<h2 className="font-serif text-2xl tracking-tight">
								{season.name}
							</h2>
							<span className="flex items-center gap-3">
								<span className="text-xs font-medium tracking-wide text-muted-foreground tabular-nums">
									{season.episodeCount} episode
									{season.episodeCount !== 1 ? "s" : ""}
								</span>
								<span
									className={`text-muted-foreground transition-transform duration-200 ease-out sm:hidden ${
										isOpen ? "rotate-180" : ""
									}`}
								>
									<ChevronDown className="size-4" />
								</span>
							</span>
						</button>

						<div
							className={`grid transition-[grid-template-rows] duration-200 ease-out sm:grid-rows-[1fr] ${
								isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
							}`}
						>
							<div className="overflow-hidden">
								{season.episodes === undefined ? (
									<p className="py-6 text-sm text-muted-foreground">
										Episodes data not loaded.
									</p>
								) : season.episodes.length === 0 ? (
									<p className="py-6 text-sm text-muted-foreground">
										No episodes available for this season.
									</p>
								) : (
									<ul className="grid grid-cols-1 border-t border-border/40 sm:grid-cols-2">
										{season.episodes.map((episode) => (
											<li
												key={episode.id}
												className="group flex items-start gap-3.5 border-b border-border/40 p-4 transition-colors duration-200 ease-out sm:border-r sm:even:border-r-0 hover:bg-muted/40"
											>
												<span className="mt-0.5 text-xs font-medium tracking-wider text-muted-foreground/70 tabular-nums">
													{String(episode.number).padStart(2, "0")}
												</span>

												<div className="min-w-0 flex-1">
													<h3 className="text-sm leading-snug font-medium">
														{episode.title}
													</h3>
													{episode.plot && (
														<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
															{episode.plot}
														</p>
													)}
													{episode.durationFormatted && (
														<p className="mt-1.5 inline-flex items-center gap-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground/80 tabular-nums">
															<Clock className="size-3" />
															{episode.durationFormatted}
														</p>
													)}
												</div>

												{episode.url && (
													<div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-within:opacity-100">
														<CopyStreamButton url={episode.url} />
														<ExternalStreamLink
															href={episode.url}
															label="Watch episode in external window"
														/>
													</div>
												)}
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</section>
				);
			})}
		</div>
	);
}
