import { EmptyState } from "@/components/empty-state";
import { FallbackImage } from "@/components/fallback-image";
import { RemoveItemButton } from "@/components/remove-item-button";
import type { ItemType, SavedItemsListProps } from "@/components/types";
import { toSafeImageSrc } from "@/lib/image-url";
import { catalogImageKey, getCatalogImages } from "@/server/catalog-lookups";
import { Clock, Film, Heart, Radio, Tv } from "lucide-react";
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

const typeIcons: Record<string, typeof Film> = {
	channel: Radio,
	movie: Film,
	series: Tv,
};

/** Poster (2:3) for movies and series, logo (square) for channels. */
function Thumbnail({ src, itemType }: { src?: string; itemType: string }) {
	const isChannel = itemType === "channel";
	const Icon = typeIcons[itemType] ?? Film;
	return (
		<div
			className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/60 ${
				isChannel ? "size-10" : "h-15 w-10"
			}`}
		>
			{src ? (
				<FallbackImage
					src={src}
					alt=""
					fill
					unoptimized
					sizes="40px"
					className={isChannel ? "object-contain p-1.5" : "object-cover"}
					fallback={
						<Icon aria-hidden className="size-4 text-muted-foreground/60" />
					}
				/>
			) : (
				<Icon aria-hidden className="size-4 text-muted-foreground/60" />
			)}
		</div>
	);
}

export async function SavedItemsList({
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

	const images = await getCatalogImages(playlistId, items);

	return (
		<ul className="divide-y divide-border/50 border-y border-border/50">
			{items.map((item) => (
				<li
					key={item.id}
					className="group relative flex items-center gap-4 py-3"
				>
					<Thumbnail
						itemType={item.itemType}
						src={toSafeImageSrc(
							images.get(catalogImageKey(item.itemType, item.itemId)),
						)}
					/>
					<div className="min-w-0 flex-1">
						<Link
							href={item.itemUrl as Route}
							className="block truncate text-[0.9375rem] font-medium decoration-muted-foreground/50 underline-offset-4 outline-none after:absolute after:inset-0 group-hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ring"
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
