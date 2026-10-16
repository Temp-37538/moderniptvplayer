import { EmptyState } from "@/components/empty-state";
import { RemoveItemButton } from "@/components/remove-item-button";
import type { ItemType, SavedItemsListProps } from "@/components/types";
import { Clock, Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

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
		);
	}

	return (
		<div className="space-y-2">
			{items.map((item) => (
				<div
					key={item.id}
					className="ml-4 flex items-center gap-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors -mx-1 px-1"
				>
					<Link
						href={item.itemUrl as Route}
						className="flex items-center gap-4 flex-1 min-w-0"
					>
						<div className="flex-1 min-w-0">
							<h3 className="text-xs font-medium leading-tight truncate">
								{item.itemName}
							</h3>
							<p className="text-[0.7rem] text-muted-foreground mt-0.5">
								{typeLabels[item.itemType] ?? item.itemType} -{" "}
								{new Date(item.createdAt).toLocaleDateString()}
							</p>
						</div>
					</Link>
					<RemoveItemButton
						itemId={item.itemId}
						itemType={item.itemType as ItemType}
						itemName={item.itemName}
						itemUrl={item.itemUrl}
						playlistId={playlistId}
						variant={variant}
					/>
				</div>
			))}
		</div>
	);
}
