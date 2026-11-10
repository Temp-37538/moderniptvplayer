"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RemoveItemButtonProps } from "@/components/types";
import { toggleWatchLater, toggleFavorite } from "@/server/user-items";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export function RemoveItemButton({
	itemId,
	itemType,
	itemName,
	itemUrl,
	playlistId,
	variant,
}: RemoveItemButtonProps) {
	const [isPending, startTransition] = useTransition();
	const listName = variant === "watchlater" ? "Watch Later" : "Favorites";

	// Removing and restoring are the same toggle.
	function toggle() {
		return variant === "watchlater"
			? toggleWatchLater(playlistId, itemId, itemType, itemName, itemUrl)
			: toggleFavorite(playlistId, itemId, itemType, itemName, itemUrl);
	}

	// The row is gone once removed, so the undo does not rely on its state.
	function handleUndo() {
		toggle().catch(() => toast.error(`Unable to restore ${itemName}`));
	}

	function handleRemove() {
		startTransition(async () => {
			try {
				await toggle();
				toast.success(`Removed ${itemName} from ${listName}`, {
					action: { label: "Undo", onClick: handleUndo },
				});
			} catch {
				toast.error(`Unable to remove ${itemName}`);
			}
		});
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={
							variant === "watchlater"
								? "Remove from Watch Later"
								: "Remove from Favorites"
						}
						disabled={isPending}
						className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
						onClick={handleRemove}
					>
						<Trash2
							className={`size-4 text-destructive transition-colors ${isPending ? "opacity-50" : ""}`}
						/>
					</button>
				}
			/>
			<TooltipContent>
				<p>Remove</p>
			</TooltipContent>
		</Tooltip>
	);
}
