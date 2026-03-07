import { EmptyState } from "@/components/empty-state";
import { RemoveItemButton } from "@/components/remove-item-button";
import type { ItemType, SavedItemsListProps } from "@/components/types";
import { ClapperboardIcon, Clock, Film, Heart, Tv } from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
	channel: <Tv className="size-4 text-blue-500" />,
	movie: <Film className="size-4 text-purple-500" />,
	series: <ClapperboardIcon className="size-4 text-orange-500" />,
};

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
					className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-4 hover:bg-muted/20 transition-colors"
				>
					<a
						href={item.itemUrl}
						className="flex items-center gap-4 flex-1 min-w-0"
					>
						<div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
							{typeIcons[item.itemType] ?? <Film className="size-4" />}
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-medium leading-tight truncate">
								{item.itemName}
							</h3>
							<p className="text-xs text-muted-foreground mt-0.5">
								{typeLabels[item.itemType] ?? item.itemType} &middot;{" "}
								{new Date(item.createdAt).toLocaleDateString()}
							</p>
						</div>
					</a>
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
