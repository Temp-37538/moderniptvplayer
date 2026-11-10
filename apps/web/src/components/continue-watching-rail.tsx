"use client";

import { removeContinueWatchingAction } from "@/app/dashboard/actions";
import { SectionHeading } from "@/components/section-heading";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PlayIcon,
	XIcon,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type ContinueWatchingCard = {
	id: string;
	playlistId: string;
	showId: string | null;
	title: string;
	href: string;
	image: string | null;
	percent: number;
	timeLeft: string | null;
	playlistName: string | null;
};

function useRailScroll() {
	const ref = useRef<HTMLUListElement>(null);
	const [canPrev, setCanPrev] = useState(false);
	const [canNext, setCanNext] = useState(false);

	const update = useCallback(() => {
		const rail = ref.current;
		if (!rail) {
			return;
		}
		setCanPrev(rail.scrollLeft > 4);
		setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
	}, []);

	useEffect(() => {
		const rail = ref.current;
		if (!rail) {
			return;
		}
		update();

		// A plain mouse wheel only scrolls vertically. While the rail can still
		// move that way, turn the wheel into horizontal scrolling; at either end
		// the page scrolls as usual.
		function onWheel(event: WheelEvent) {
			if (!rail || event.ctrlKey || event.shiftKey) {
				return;
			}
			if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
				return;
			}
			const max = rail.scrollWidth - rail.clientWidth;
			const goingForward = event.deltaY > 0;
			if (
				max <= 0 ||
				(goingForward && rail.scrollLeft >= max - 1) ||
				(!goingForward && rail.scrollLeft <= 0)
			) {
				return;
			}
			event.preventDefault();
			rail.scrollLeft += event.deltaY;
		}

		const observer = new ResizeObserver(update);
		observer.observe(rail);
		rail.addEventListener("scroll", update, { passive: true });
		rail.addEventListener("wheel", onWheel, { passive: false });
		return () => {
			observer.disconnect();
			rail.removeEventListener("scroll", update);
			rail.removeEventListener("wheel", onWheel);
		};
	}, [update]);

	const scrollByPage = useCallback((direction: 1 | -1) => {
		const rail = ref.current;
		if (!rail) {
			return;
		}
		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		rail.scrollBy({
			left: direction * rail.clientWidth * 0.85,
			behavior: reduceMotion ? "auto" : "smooth",
		});
	}, []);

	return { ref, canPrev, canNext, update, scrollByPage };
}

export function ContinueWatchingRail({
	items,
}: {
	items: ContinueWatchingCard[];
}) {
	const router = useRouter();
	const [hidden, setHidden] = useState<Set<string>>(() => new Set());
	const [pending, setPending] = useState<string | null>(null);
	const [confirmItem, setConfirmItem] = useState<ContinueWatchingCard | null>(
		null,
	);
	const { ref, canPrev, canNext, update, scrollByPage } = useRailScroll();
	const visible = items.filter((item) => !hidden.has(item.id));

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when cards are removed
	useEffect(() => {
		update();
	}, [visible.length, update]);

	async function remove(item: ContinueWatchingCard) {
		setPending(item.id);
		try {
			await removeContinueWatchingAction({
				id: item.id,
				playlistId: item.playlistId,
				showId: item.showId,
			});
			setHidden((current) => new Set(current).add(item.id));
			toast.success(`Removed ${item.title} from Continue watching`);
			router.refresh();
		} catch {
			toast.error(`Unable to remove ${item.title}`);
		} finally {
			setPending(null);
			setConfirmItem(null);
		}
	}

	function requestRemove(item: ContinueWatchingCard) {
		// A show loses the progress of every episode, so ask first.
		if (item.showId) {
			setConfirmItem(item);
			return;
		}
		void remove(item);
	}

	// Removing the last card removes the whole section, heading included.
	if (visible.length === 0) {
		return null;
	}

	return (
		<section aria-labelledby="continue-heading">
			<SectionHeading id="continue-heading" title="Continue watching" />
			{/* inline-size containment keeps the long rail from widening the page */}
			<div className="relative [contain:inline-size]">
				<ul
					ref={ref}
					aria-label="Continue watching"
					className="-mx-1 flex snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto px-1 pt-1 pb-3 sm:gap-4 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]"
				>
					{visible.map((item) => (
						<li
							key={item.id}
							className="group/card relative w-36 shrink-0 snap-start sm:w-40 lg:w-44"
						>
							<Link
								href={item.href as Route}
								className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
							>
								<div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border/50 bg-muted shadow-sm transition-shadow group-hover/card:shadow-lg">
									{item.image ? (
										<Image
											src={item.image}
											alt=""
											fill
											sizes="176px"
											unoptimized
											className="object-cover transition-transform duration-300 group-hover/card:scale-105 motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
										/>
									) : (
										<div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted to-accent">
											<PlayIcon className="size-8 text-muted-foreground/50" />
										</div>
									)}
									<div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 to-transparent" />
									<span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-md transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100">
										<PlayIcon className="ml-0.5 size-5 fill-current" />
									</span>
									<div
										className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/30"
										role="progressbar"
										aria-label="Watched"
										aria-valuemin={0}
										aria-valuemax={100}
										aria-valuenow={item.percent}
									>
										<div
											className="h-full rounded-full bg-primary"
											style={{ width: `${item.percent}%` }}
										/>
									</div>
								</div>
								<p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">
									{item.title}
								</p>
								<p className="mt-0.5 truncate text-xs text-muted-foreground">
									{[
										item.showId ? "Series" : "Movie",
										item.timeLeft,
										item.playlistName,
									]
										.filter(Boolean)
										.join(" · ")}
								</p>
							</Link>
							<button
								type="button"
								aria-label={`Remove ${item.title} from Continue watching`}
								title="Remove from Continue watching"
								disabled={pending === item.id}
								onClick={() => requestRemove(item)}
								className="absolute top-2 right-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-opacity outline-none hover:bg-background focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/60 disabled:opacity-60 md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100 pointer-coarse:opacity-100"
							>
								{pending === item.id ? (
									<Spinner className="size-4" />
								) : (
									<XIcon className="size-4" />
								)}
							</button>
						</li>
					))}
				</ul>
				<RailArrow
					direction={-1}
					disabled={!canPrev}
					onClick={() => scrollByPage(-1)}
				/>
				<RailArrow
					direction={1}
					disabled={!canNext}
					onClick={() => scrollByPage(1)}
				/>
			</div>

			<AlertDialog
				open={confirmItem !== null}
				onOpenChange={(open) => {
					if (!open && pending === null) {
						setConfirmItem(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove from Continue watching?</AlertDialogTitle>
						<AlertDialogDescription>
							This clears your progress for every episode of this show,
							including the ones marked as watched.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={pending !== null}>
							Cancel
						</AlertDialogCancel>
						<Button
							type="button"
							variant="destructive"
							disabled={pending !== null}
							onClick={() => {
								if (confirmItem) {
									void remove(confirmItem);
								}
							}}
						>
							{pending !== null ? <Spinner /> : null}
							Remove
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

function RailArrow({
	direction,
	disabled,
	onClick,
}: {
	direction: 1 | -1;
	disabled: boolean;
	onClick: () => void;
}) {
	const Icon = direction === 1 ? ChevronRightIcon : ChevronLeftIcon;
	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			aria-label={direction === 1 ? "Scroll right" : "Scroll left"}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"absolute top-[calc(50%-1.75rem)] z-10 hidden -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur disabled:opacity-0 md:inline-flex",
				direction === 1 ? "right-1" : "left-1",
			)}
		>
			<Icon className="size-5" />
		</Button>
	);
}
