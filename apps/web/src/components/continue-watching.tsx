import { toSafeImageSrc } from "@/lib/image-url";
import { getContinueWatching } from "@/server/watch-progress";
import { PlayIcon } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

export async function ContinueWatching() {
	const items = await getContinueWatching();
	if (items.length === 0) {
		return null;
	}

	return (
		<section className="mb-8">
			<h2 className="mb-3 text-lg font-semibold">Continue watching</h2>
			<div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
				{items.map((item) => {
					const image = toSafeImageSrc(item.itemImage ?? undefined);
					const percent =
						item.durationSec > 0
							? Math.min(100, (item.positionSec / item.durationSec) * 100)
							: 0;
					return (
						<Link
							key={item.id}
							href={item.itemUrl as Route}
							className="group w-36 shrink-0 space-y-2"
						>
							<div className="relative aspect-2/3 overflow-hidden rounded-lg border border-border/40 bg-muted">
								{image ? (
									<Image
										src={image}
										alt={item.itemName}
										width={144}
										height={216}
										unoptimized
										className="size-full object-cover transition-transform group-hover:scale-105"
									/>
								) : (
									<PlayIcon className="absolute inset-0 m-auto size-8 text-muted-foreground/40" />
								)}
								<div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
									<div
										className="h-full bg-primary"
										style={{ width: `${percent}%` }}
									/>
								</div>
							</div>
							<p className="line-clamp-2 text-sm font-medium leading-tight">
								{item.itemName}
							</p>
						</Link>
					);
				})}
			</div>
		</section>
	);
}
