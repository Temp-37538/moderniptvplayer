"use client";

import { Button } from "@/components/ui/button";
import {
	deletePlaylistAction,
	refreshPlaylistCacheAction,
} from "@/server/forms";
import { ListVideoIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export type PlaylistCardData = {
	id: string;
	playlistName: string;
	serverUrl: string;
	username: string;
	createdAt: string;
};

export function PlaylistCard({
	id,
	playlistName,
	serverUrl,
	username,
	createdAt,
}: PlaylistCardData) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	return (
		<div className="rounded-xl border border-border/50 bg-card p-5 transition-colors hover:bg-muted/20">
			<div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
				<ListVideoIcon className="size-5" />
			</div>
			<div className="mt-4 min-w-0">
				<p className="font-medium truncate">{playlistName}</p>
				<p className="text-xs text-muted-foreground truncate">
					{username} · {serverUrl}
				</p>
				<p className="text-xs text-muted-foreground/70">{createdAt}</p>
			</div>
			<div className="mt-4 flex items-center gap-2">
				<Button
					className="flex-1"
					nativeButton={false}
					render={<Link href={`/dashboard/${id}` as Route} />}
				>
					Open
				</Button>
				<Button
					size="icon"
					variant="outline"
					aria-label="Refresh cache"
					disabled={isPending}
					onClick={() => {
						startTransition(async () => {
							try {
								await refreshPlaylistCacheAction(id);
								router.refresh();
								toast.success(`Cache refreshed for ${playlistName}`);
							} catch {
								toast.error("Unable to refresh playlist cache");
							}
						});
					}}
				>
					<RefreshCwIcon className="size-4" />
				</Button>
				<Button
					size="icon"
					variant="outline"
					aria-label="Delete playlist"
					disabled={isPending}
					onClick={() => {
						startTransition(async () => {
							try {
								await deletePlaylistAction(id);
								router.replace("/dashboard");
								toast.success(`Playlist deleted: ${playlistName}`);
							} catch {
								toast.error("Unable to delete playlist ");
							}
						});
					}}
				>
					<Trash2Icon className="size-4" />
				</Button>
			</div>
		</div>
	);
}
