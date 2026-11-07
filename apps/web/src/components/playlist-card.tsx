"use client";

import { DeletePlaylistDialog } from "@/components/delete-playlist-dialog";
import { EditPlaylistSheet } from "@/components/edit-playlist-sheet";
import { Button } from "@/components/ui/button";
import { refreshPlaylistCacheAction } from "@/server/forms";
import {
	ChevronRightIcon,
	PencilIcon,
	RefreshCwIcon,
	Trash2Icon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

export type PlaylistCardData = {
	id: string;
	source: "XTREAM" | "M3U";
	playlistName: string;
	serverUrl: string;
	username: string;
	createdAt: string;
};

type PlaylistCardProps = PlaylistCardData & {
	subscriptionStatus?: ReactNode;
};

export function PlaylistCard({
	id,
	source,
	playlistName,
	serverUrl,
	username,
	createdAt,
	subscriptionStatus,
}: PlaylistCardProps) {
	const router = useRouter();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	async function refreshCache() {
		setIsRefreshing(true);
		try {
			await refreshPlaylistCacheAction(id);
			router.refresh();
			toast.success(`Cache refreshed for ${playlistName}`);
		} catch {
			toast.error("Unable to refresh playlist cache");
		} finally {
			setIsRefreshing(false);
		}
	}

	return (
		<div>
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
							{source === "M3U" ? `M3U - ${serverUrl}` : serverUrl} -{" "}
							{createdAt}
						</p>
						{subscriptionStatus ? (
							<div className="mt-0.5 truncate text-xs text-muted-foreground">
								{subscriptionStatus}
							</div>
						) : null}
					</div>
					<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
				</Link>

				<div className="flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-2">
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label={`Edit ${playlistName}`}
						onClick={() => setEditOpen(true)}
					>
						<PencilIcon className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label={`Refresh cache for ${playlistName}`}
						disabled={isRefreshing}
						onClick={refreshCache}
					>
						<RefreshCwIcon
							className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
						/>
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label={`Delete ${playlistName}`}
						className="hover:text-destructive"
						onClick={() => setDeleteOpen(true)}
					>
						<Trash2Icon className="size-4" />
					</Button>
				</div>
			</div>
			<EditPlaylistSheet
				open={editOpen}
				onOpenChange={setEditOpen}
				fieldIdPrefix={`card-${id}`}
				playlist={{ id, source, playlistName, serverUrl, username }}
			/>
			<DeletePlaylistDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				playlistId={id}
				playlistName={playlistName}
				serverUrl={serverUrl}
			/>
		</div>
	);
}
