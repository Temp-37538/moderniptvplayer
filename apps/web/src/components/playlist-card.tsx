"use client";

import { Button } from "@/components/ui/button";
import {
	deletePlaylistAction,
	refreshPlaylistCacheAction,
} from "@/server/forms";
import { ChevronRightIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export type PlaylistCardData = {
	id: string;
	playlistName: string;
	serverUrl: string;
	username: string;
	createdAt: string;
};

type PlaylistCardAction = "refresh" | "delete";

export function PlaylistCard({
	id,
	playlistName,
	serverUrl,
	username,
	createdAt,
}: PlaylistCardData) {
	const router = useRouter();
	const [pendingAction, setPendingAction] = useState<PlaylistCardAction | null>(
		null,
	);

	async function refreshCache() {
		setPendingAction("refresh");
		try {
			await refreshPlaylistCacheAction(id);
			router.refresh();
			toast.success(`Cache refreshed for ${playlistName}`);
		} catch {
			toast.error("Unable to refresh playlist cache");
		} finally {
			setPendingAction(null);
		}
	}

	async function deletePlaylist() {
		setPendingAction("delete");
		try {
			await deletePlaylistAction(id);
			router.replace("/dashboard");
			toast.success(`Playlist deleted: ${playlistName}`);
		} catch {
			toast.error("Unable to delete playlist");
		} finally {
			setPendingAction(null);
		}
	}

	return (
		<div className="group flex items-center gap-4 py-3.5 pl-2">
			<Link
				href={`/dashboard/${id}` as Route}
				className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:gap-4"
			>
				<div className="min-w-0 flex-1">
					<p className="truncate text-xs font-semibold tracking-tight transition-colors group-hover:text-primary">
						{playlistName}
					</p>
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{serverUrl} - {createdAt}
					</p>
				</div>
				<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
			</Link>

			<div className="flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-2">

				<Button
					size="icon-sm"
					variant="ghost"
					aria-label={`Refresh cache for ${playlistName}`}
					disabled={pendingAction === "refresh"}
					onClick={refreshCache}
				>
					<RefreshCwIcon
						className={`size-4 ${pendingAction === "refresh" ? "animate-spin" : ""}`}
					/>
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					aria-label={`Delete ${playlistName}`}
					className="hover:text-destructive"
					disabled={pendingAction === "delete"}
					onClick={deletePlaylist}
				>
					<Trash2Icon className="size-4" />
				</Button>
			</div>
		</div>
	);
}
