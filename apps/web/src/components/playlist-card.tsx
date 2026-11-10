"use client";

import { DeletePlaylistDialog } from "@/components/delete-playlist-dialog";
import { EditPlaylistSheet } from "@/components/edit-playlist-sheet";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { refreshPlaylistCacheAction } from "@/server/forms";
import { EllipsisIcon } from "lucide-react";
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

function serverHost(serverUrl: string) {
	try {
		return new URL(serverUrl).host || serverUrl;
	} catch {
		return serverUrl;
	}
}

/** One playlist row on the home page. The whole row opens the playlist. */
export function PlaylistCard({
	id,
	source,
	playlistName,
	serverUrl,
	username,
	subscriptionStatus,
}: PlaylistCardProps) {
	const router = useRouter();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const sections = [
		{ label: "Live TV", href: `/dashboard/channels/${id}` },
		{ label: "Movies", href: `/dashboard/movies/${id}` },
		{ label: "Series", href: `/dashboard/series/${id}` },
	];

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
		<li className="group relative flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
			<div className="min-w-0 flex-1">
				<Link
					href={`/dashboard/${id}` as Route}
					className="block truncate text-base font-semibold tracking-tight outline-none after:absolute after:inset-0 focus-visible:after:rounded-[inherit] focus-visible:after:ring-3 focus-visible:after:ring-ring/60 focus-visible:after:ring-inset"
				>
					{playlistName}
				</Link>
				<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
					<span className="shrink-0">
						{source === "M3U" ? "M3U" : "Xtream"}
					</span>
					<span aria-hidden>·</span>
					<span className="truncate" title={serverUrl}>
						{source === "M3U"
							? serverHost(serverUrl)
							: `${username}@${serverHost(serverUrl)}`}
					</span>
					{subscriptionStatus ? (
						<>
							<span aria-hidden>·</span>
							<span className="shrink-0">{subscriptionStatus}</span>
						</>
					) : null}
				</div>
			</div>

			<div className="relative z-10 -ml-2 flex items-center gap-1 sm:ml-0">
				<nav aria-label={`Browse ${playlistName}`} className="flex gap-1">
					{sections.map(({ label, href }) => (
						<Button
							key={label}
							variant="ghost"
							size="sm"
							nativeButton={false}
							render={<Link href={href as Route} />}
							className="text-muted-foreground hover:text-foreground"
						>
							{label}
						</Button>
					))}
				</nav>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={`More actions for ${playlistName}`}
								className="ml-auto text-muted-foreground hover:text-foreground"
							/>
						}
					>
						<EllipsisIcon className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-auto min-w-44">
						<DropdownMenuItem onClick={() => setEditOpen(true)}>
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem disabled={isRefreshing} onClick={refreshCache}>
							{isRefreshing ? "Refreshing..." : "Refresh cache"}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => setDeleteOpen(true)}
						>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
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
		</li>
	);
}
