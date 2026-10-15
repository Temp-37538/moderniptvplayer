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
	deletePlaylistAction,
	preparePlaylistSwitchAction,
	refreshPlaylistCacheAction,
} from "@/server/forms";
import {
	ChevronsUpDownIcon,
	ListVideoIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import { usePlaylists } from "./playlist-context";
import type { Playlist } from "./types";

export function PlaylistSwitcher() {
	const playlists = usePlaylists();
	const { isMobile, setOpenMobile, openMobile } = useSidebar();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
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

	const setActivePlaylist = (playlist: Playlist) => {
		if (playlist.id === activePlaylist?.id) {
			return;
		}

		const basePath = buildSectionRoute(section);
		const previousPlaylistId = activePlaylist?.id ?? null;
		const nextPlaylistId = playlist.id;
		const nextRoute = buildPlaylistRoute(basePath, nextPlaylistId);

		startTransition(async () => {
			try {
				if (previousPlaylistId || nextPlaylistId) {
					await preparePlaylistSwitchAction(previousPlaylistId, nextPlaylistId);
				}
				router.replace(nextRoute);
			} catch {
				toast.error("Unable to switch playlist");
			}
		});
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
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
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
						className="min-w-56 rounded-lg"
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
									onClick={() => {
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
											{playlist.username} {playlist.serverUrl}
										</div>
									</div>
									<Button
										size="sm"
										disabled={isPending}
										className="ml-2 "
										onClick={(e) => {
											e.stopPropagation();
											startTransition(async () => {
												try {
													await refreshPlaylistCacheAction(playlist.id);
													router.refresh();
													toast.success(
														`Cache refreshed for ${playlist.playlistName}`,
													);
												} catch {
													toast.error("Unable to refresh playlist cache");
												}
											});
										}}
									>
										<RefreshCwIcon className="size-4" />
									</Button>
									<Button
										size="sm"
										disabled={isPending}
										className="ml-2"
										onClick={(e) => {
											e.stopPropagation();
											startTransition(async () => {
												try {
													await deletePlaylistAction(playlist.id);
													router.replace("/dashboard");
													toast.success(
														`Playlist deleted: ${playlist.playlistName}`,
													);
												} catch {
													toast.error("Unable to delete playlist ");
												}
											});
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
	);
}
