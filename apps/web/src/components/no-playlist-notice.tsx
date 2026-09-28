import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export function NoPlaylistNotice() {
	return (
		<div className="flex flex-1 flex-col px-4 pt-10 pb-16">
			<div className="max-w-xl">
				<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
					Start with a playlist.
				</h2>

				<p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
					Import an Xtream or M3U playlist to bring live TV, movies, and series
					into your library.
				</p>

				<Button
					className="group mt-7"
					nativeButton={false}
					render={<Link href="/dashboard/addplaylist" />}
				>
					<PlusIcon className="size-4 transition-transform duration-200 group-hover:rotate-90" />
					Add a playlist
				</Button>
			</div>
		</div>
	);
}
