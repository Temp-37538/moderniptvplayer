"use client";

import { FallbackImage } from "@/components/fallback-image";
import { Button } from "@/components/ui/button";
import { channelNeighbors } from "@/lib/channel-neighbors";
import { isTypingTarget } from "@/lib/player/shortcuts";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, Radio } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export type SwitcherChannel = {
	id: string;
	name: string;
	/** Already proxied. */
	logo?: string;
	number: number;
};

const PREVIOUS_KEYS = new Set(["p", "P", "ChannelDown", "MediaTrackPrevious"]);
const NEXT_KEYS = new Set(["n", "N", "ChannelUp", "MediaTrackNext"]);

/**
 * Zapping from the player: previous and next channel of the category, P and
 * N (or a remote's channel keys), and the category's list. Links are not
 * prefetched: each channel page asks the provider for its stream.
 */
export function ChannelSwitcher({
	channels,
	currentId,
	baseHref,
}: {
	channels: SwitcherChannel[];
	currentId: string;
	/** `/dashboard/channels/<playlist>/<category>` */
	baseHref: string;
}) {
	const router = useRouter();
	const currentRef = useRef<HTMLAnchorElement>(null);
	const neighbors = channelNeighbors(channels, currentId);
	const hrefOf = (channel: SwitcherChannel) =>
		`${baseHref}/${encodeURIComponent(channel.id)}` as Route;
	const previousHref = neighbors ? hrefOf(neighbors.previous) : null;
	const nextHref = neighbors ? hrefOf(neighbors.next) : null;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				isTypingTarget(event.target instanceof Element ? event.target : null)
			) {
				return;
			}
			const href = PREVIOUS_KEYS.has(event.key)
				? previousHref
				: NEXT_KEYS.has(event.key)
					? nextHref
					: null;
			if (href) {
				event.preventDefault();
				router.push(href);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [previousHref, nextHref, router]);

	// Keeps the current channel in view inside the list, without scrolling
	// the page.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs again for each channel
	useEffect(() => {
		const item = currentRef.current;
		const list = item?.closest("ul");
		if (!item || !list) {
			return;
		}
		// Scrolls by whole rows so the top of the list starts on a row edge
		// rather than a sliver of the row above, with the current channel
		// near the middle.
		const top =
			item.getBoundingClientRect().top -
			list.getBoundingClientRect().top +
			list.scrollTop;
		const next = item.closest("li")?.nextElementSibling;
		const step = next
			? next.getBoundingClientRect().top - item.getBoundingClientRect().top
			: item.offsetHeight;
		const padding = Number.parseFloat(getComputedStyle(list).paddingTop) || 0;
		const rowsAbove = Math.max(
			0,
			Math.floor((list.clientHeight / step - 1) / 2),
		);
		list.scrollTop = Math.max(0, top - padding - rowsAbove * step);
	}, [currentId]);

	if (channels.length === 0) {
		return null;
	}

	const position = channels.findIndex((channel) => channel.id === currentId);

	return (
		<nav aria-label="Channels in this category">
			{neighbors && (
				<div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
					<Button
						variant="ghost"
						size="sm"
						nativeButton={false}
						className="-ml-2.5 text-muted-foreground hover:text-foreground"
						aria-label={`Previous channel: ${neighbors.previous.name}`}
						title="Previous channel (P)"
						render={<Link href={hrefOf(neighbors.previous)} prefetch={false} />}
					>
						<ChevronLeftIcon />
						Previous
					</Button>
					{position >= 0 && (
						<span className="text-xs tabular-nums text-muted-foreground">
							{position + 1} of {channels.length}
						</span>
					)}
					<Button
						variant="ghost"
						size="sm"
						nativeButton={false}
						className="-mr-2.5 text-muted-foreground hover:text-foreground"
						aria-label={`Next channel: ${neighbors.next.name}`}
						title="Next channel (N)"
						render={<Link href={hrefOf(neighbors.next)} prefetch={false} />}
					>
						Next
						<ChevronRightIcon />
					</Button>
				</div>
			)}
			<ul className="-mx-2 max-h-96 overflow-y-auto py-1 xl:max-h-[min(70svh,40rem)]">
				{channels.map((channel) => {
					const current = channel.id === currentId;
					return (
						<li key={channel.id}>
							<Link
								ref={current ? currentRef : undefined}
								href={hrefOf(channel)}
								prefetch={false}
								aria-current={current ? "page" : undefined}
								// Plain list: the current channel gets a square muted row
								// and a bold name, no accent color or bar.
								className={cn(
									"flex items-center gap-3 px-2 py-1.5 text-sm text-foreground/85 outline-none transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
									current &&
										"bg-muted font-semibold text-foreground hover:bg-muted",
								)}
							>
								<span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/60">
									{channel.logo ? (
										<FallbackImage
											src={channel.logo}
											alt=""
											width={32}
											height={32}
											unoptimized
											className="size-full object-contain p-0.5"
											fallback={
												<Radio className="size-4 text-muted-foreground/50" />
											}
										/>
									) : (
										<Radio className="size-4 text-muted-foreground/50" />
									)}
								</span>
								<span className="min-w-0 flex-1 truncate">
									{channel.name}
									{current && (
										<span className="block text-xs font-normal text-muted-foreground">
											Now playing
										</span>
									)}
								</span>
								{channel.number > 0 && (
									<span className="text-xs text-muted-foreground tabular-nums">
										{channel.number}
									</span>
								)}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
