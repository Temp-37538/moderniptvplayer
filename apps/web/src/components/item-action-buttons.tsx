"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ItemActionButtonsProps } from "@/components/types";
import { toggleWatchLater, toggleFavorite } from "@/server/user-items";
import { Clock, Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";

export function ItemActionButtons({
  playlistId,
  itemId,
  itemType,
  itemName,
  itemUrl,
  isWatchLater,
  isFavorite,
}: ItemActionButtonsProps) {
  const [isPendingWL, startTransitionWL] = useTransition();
  const [isPendingFav, startTransitionFav] = useTransition();

  const [optimisticWL, setOptimisticWL] = useOptimistic(isWatchLater);
  const [optimisticFav, setOptimisticFav] = useOptimistic(isFavorite);

  function handleToggleWatchLater() {
    startTransitionWL(async () => {
      setOptimisticWL(!optimisticWL);
      await toggleWatchLater(playlistId, itemId, itemType, itemName, itemUrl);
    });
  }

  function handleToggleFavorite() {
    startTransitionFav(async () => {
      setOptimisticFav(!optimisticFav);
      await toggleFavorite(playlistId, itemId, itemType, itemName, itemUrl);
    });
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              disabled={isPendingWL}
              className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors disabled:opacity-50"
              onClick={handleToggleWatchLater}
            >
              <Clock
                className={`size-4 transition-transform duration-150 ${
                  optimisticWL ? "text-blue-500 fill-blue-500 scale-110" : ""
                }`}
              />
            </button>
          }
        />
        <TooltipContent>
          <p>
            {optimisticWL ? "Remove from Watch Later" : "Add to Watch Later"}
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              disabled={isPendingFav}
              className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors disabled:opacity-50"
              onClick={handleToggleFavorite}
            >
              <Heart
                className={`size-4 transition-transform duration-150 ${
                  optimisticFav ? "text-red-500 fill-red-500 scale-110" : ""
                }`}
              />
            </button>
          }
        />
        <TooltipContent>
          <p>{optimisticFav ? "Remove from Favorites" : "Add to Favorites"}</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
