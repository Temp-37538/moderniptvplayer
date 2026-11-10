import { EmptyState } from "@/components/empty-state";
import { RemoveItemButton } from "@/components/remove-item-button";
import type { ItemType, SavedItemsListProps } from "@/components/types";
import { Clock, Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

const savedDateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
});

const typeLabels: Record<string, string> = {
	channel: "Channel",
	movie: "Movie",
	series: "Series",
};

export function SavedItemsList({
	items,
	playlistId,
	variant,
}: SavedItemsListProps) {
	if (items.length === 0) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<EmptyState
					icon={
						variant === "watchlater" ? (
							<Clock className="size-12 mb-4 opacity-30" />
						) : (
							<Heart className="size-12 mb-4 opacity-30" />
						)
					}
					title={
						variant === "watchlater"
							? "No items in Watch Later"
							: "No favorites yet"
					}
					description={
						variant === "watchlater"
							? "Add items to watch later from channel, movie or series pages"
							: "Add favorites from channel, movie or series pages"
					}
				/>
			</div>
		);
	}

	return (
		<ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
			{items.map((item) => (
				<li
					key={item.id}
					className="group relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
				>
					<div className="min-w-0 flex-1">
						<Link
							href={item.itemUrl as Route}
							className="block truncate text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/60 focus-visible:after:ring-inset"
						>
							{item.itemName}
						</Link>
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{typeLabels[item.itemType] ?? item.itemType} · Added{" "}
							{savedDateFormatter.format(new Date(item.createdAt))}
						</p>
					</div>
					<div className="relative z-10">
						<RemoveItemButton
							itemId={item.itemId}
							itemType={item.itemType as ItemType}
							itemName={item.itemName}
							itemUrl={item.itemUrl}
							playlistId={playlistId}
							variant={variant}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}
