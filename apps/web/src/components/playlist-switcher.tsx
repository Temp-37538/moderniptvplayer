import { DeletePlaylistDialog } from "@/components/delete-playlist-dialog";
import { EditPlaylistSheet } from "@/components/edit-playlist-sheet";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { usePlaylistIdFromPath } from "@/hooks/use-playlist-id";
import {
	preparePlaylistSwitchAction,
	refreshPlaylistCacheAction,
} from "@/server/forms";
import {
	ChevronsUpDownIcon,
	ListVideoIcon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { playlistAccountLine } from "@/lib/playlist-label";
import { usePlaylists } from "./playlist-context";
import type { Playlist } from "./types";

export function PlaylistSwitcher() {
	const playlists = usePlaylists();
	const { isMobile, setOpenMobile, openMobile } = useSidebar();
	const router = useRouter();
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Playlist | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const { section, playlistId: playlistIdFromPath } = usePlaylistIdFromPath();

	const activePlaylist = (() => {
		if (playlistIdFromPath) {
			const found = playlists.find((p) => p.id === playlistIdFromPath);
			if (found) {
				return found;
			}
		}
		return playlists[0] || null;
	})();

	const buildSectionRoute = useCallback(
		(targetSection: typeof section) =>
			(targetSection ? `/dashboard/${targetSection}` : "/dashboard") as Route,
		[],
	);

	const buildPlaylistRoute = useCallback(
		(basePath: Route, playlistId: string) =>
			`${basePath}/${playlistId}` as Route,
		[],
	);

	const setActivePlaylist = async (playlist: Playlist) => {
		if (playlist.id === activePlaylist?.id || pendingAction !== null) {
			return;
		}

		const basePath = buildSectionRoute(section);
		const previousPlaylistId = activePlaylist?.id ?? null;
		const nextPlaylistId = playlist.id;
		const nextRoute = buildPlaylistRoute(basePath, nextPlaylistId);

		setPendingAction(`switch:${nextPlaylistId}`);
		try {
			await preparePlaylistSwitchAction(previousPlaylistId, nextPlaylistId);
			router.replace(nextRoute);
		} catch {
			toast.error("Unable to switch playlist");
		} finally {
			setPendingAction(null);
		}
	};

	const refreshCache = async (playlist: Playlist) => {
		setPendingAction(`refresh:${playlist.id}`);
		try {
			await refreshPlaylistCacheAction(playlist.id);
			router.refresh();
			toast.success(`Cache refreshed for ${playlist.playlistName}`);
		} catch {
			toast.error("Unable to refresh playlist cache");
		} finally {
			setPendingAction(null);
		}
	};

	const openEdit = (playlist: Playlist) => {
		setEditTarget(playlist);
		setMenuOpen(false);
		setEditOpen(true);
	};

	const openDelete = (playlist: Playlist) => {
		setDeleteTarget(playlist);
		setMenuOpen(false);
		setDeleteOpen(true);
	};

	if (!activePlaylist) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton
						size="lg"
						tooltip="Add a playlist"
						render={<Link href="/dashboard/addplaylist" />}
					>
						<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
							<ListVideoIcon />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">No playlist</span>
							<span className="truncate text-xs text-muted-foreground">
								Add a playlist to get started
							</span>
						</div>
						<PlusIcon className="ml-auto" />
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}
	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu
						open={menuOpen}
						onOpenChange={(nextOpen) => setMenuOpen(nextOpen)}
					>
						<DropdownMenuTrigger
							render={
								<SidebarMenuButton
									size="lg"
									className="data-open:bg-sidebar-accent cursor-pointer data-open:text-sidebar-accent-foreground"
								/>
							}
						>
							<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								<ListVideoIcon />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{activePlaylist.playlistName}
								</span>
								<span className="truncate text-xs text-muted-foreground group-hover/menu-button:text-sidebar-accent-foreground">
									{activePlaylist.serverUrl}
								</span>
							</div>
							<ChevronsUpDownIcon className="ml-auto" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="min-w-80 rounded-lg"
							align="start"
							side={isMobile ? "bottom" : "right"}
							sideOffset={4}
						>
							<DropdownMenuGroup>
								<DropdownMenuLabel className="text-muted-foreground text-xs">
									My Playlists
								</DropdownMenuLabel>
								{playlists.map((playlist) => (
									<DropdownMenuItem
										key={playlist.id}
										onClick={(event) => {
											if (
												event.target instanceof Element &&
												event.target.closest("button")
											) {
												return;
											}
											openMobile && setOpenMobile(false);
											setActivePlaylist(playlist);
										}}
										className="gap-2 p-2 cursor-pointer hover:bg-secondary hover:text-secondary-foreground"
									>
										<div className="flex-1 min-w-0">
											<div className="truncate font-medium">
												{playlist.playlistName}
											</div>
											<div className="truncate text-xs text-muted-foreground">
												{playlistAccountLine(playlist)}
											</div>
										</div>
										<Button
											type="button"
											size="sm"
											aria-label={`Edit ${playlist.playlistName}`}
											className="ml-2 shrink-0"
											onClick={(event) => {
												event.stopPropagation();
												openEdit(playlist);
											}}
										>
											<PencilIcon className="size-4" />
										</Button>
										<Button
											type="button"
											size="sm"
											aria-label={`Refresh cache for ${playlist.playlistName}`}
											disabled={pendingAction === `refresh:${playlist.id}`}
											className="ml-2 shrink-0"
											onClick={(event) => {
												event.stopPropagation();
												refreshCache(playlist);
											}}
										>
											<RefreshCwIcon
												className={`size-4 ${pendingAction === `refresh:${playlist.id}` ? "animate-spin" : ""}`}
											/>
										</Button>
										<Button
											type="button"
											size="sm"
											aria-label={`Delete ${playlist.playlistName}`}
											className="ml-2 shrink-0"
											onClick={(event) => {
												event.stopPropagation();
												openDelete(playlist);
											}}
										>
											<Trash2Icon className="size-4" />
										</Button>
									</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem className="cursor-pointer hover:bg-primary hover:text-primary-foreground p-0">
									<Link
										onClick={() => {
											openMobile && setOpenMobile(false);
										}}
										href="/dashboard/addplaylist"
										className="bg-transparent flex gap-2 justify-content p-2 items-center font-medium w-full h-full"
									>
										<PlusIcon className="size-4" />
										Add a playlist
									</Link>
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			<EditPlaylistSheet
				open={editOpen}
				onOpenChange={setEditOpen}
				fieldIdPrefix={`switcher-${editTarget?.id ?? "none"}`}
				playlist={
					editTarget
						? {
								id: editTarget.id,
								source: editTarget.source,
								playlistName: editTarget.playlistName,
								serverUrl: editTarget.serverUrl,
								username: editTarget.username,
							}
						: null
				}
			/>
			<DeletePlaylistDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				playlistId={deleteTarget?.id ?? ""}
				playlistName={deleteTarget?.playlistName ?? ""}
				serverUrl={deleteTarget?.serverUrl ?? ""}
			/>
		</>
	);
}
