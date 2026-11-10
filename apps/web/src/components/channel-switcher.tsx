"use client";

import { Button } from "@/components/ui/button";
import { channelNeighbors } from "@/lib/channel-neighbors";
import { isTypingTarget } from "@/lib/player/shortcuts";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, Radio } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
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
		if (item && list) {
			list.scrollTop =
				item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2;
		}
	}, [currentId]);

	if (channels.length === 0) {
		return null;
	}

	return (
		<nav aria-label="Channels in this category" className="space-y-3">
			{neighbors && (
				<div className="flex items-center justify-between gap-2">
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						aria-label={`Previous channel: ${neighbors.previous.name}`}
						title="Previous channel (P)"
						render={<Link href={hrefOf(neighbors.previous)} prefetch={false} />}
					>
						<ChevronLeftIcon />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						aria-label={`Next channel: ${neighbors.next.name}`}
						title="Next channel (N)"
						render={<Link href={hrefOf(neighbors.next)} prefetch={false} />}
					>
						Next
						<ChevronRightIcon />
					</Button>
				</div>
			)}
			<ul className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-card p-1 xl:max-h-[min(70svh,40rem)]">
				{channels.map((channel) => {
					const current = channel.id === currentId;
					return (
						<li key={channel.id}>
							<Link
								ref={current ? currentRef : undefined}
								href={hrefOf(channel)}
								prefetch={false}
								aria-current={current ? "page" : undefined}
								className={cn(
									"flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/60",
									current && "bg-accent font-medium text-primary",
								)}
							>
								<span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
									{channel.logo ? (
										<Image
											src={channel.logo}
											alt=""
											width={32}
											height={32}
											unoptimized
											className="size-full object-contain p-0.5"
										/>
									) : (
										<Radio className="size-4 text-muted-foreground/50" />
									)}
								</span>
								<span className="min-w-0 flex-1 truncate">{channel.name}</span>
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
