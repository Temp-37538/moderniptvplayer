import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	ChevronsUpDownIcon,
	ListVideoIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useTransition } from "react";
import { deletePlaylistAction } from "@/server/forms";
import {
	usePlaylistIdFromPath,
	NON_PLAYLIST_ROUTES,
	PLAYLIST_SECTIONS,
	SEARCH_SUB_ROUTES,
} from "@/hooks/use-playlist-id";
import { usePlaylists } from "./playlist-context";
import { NO_PLAYLIST_ID, type Playlist } from "./types";

export function PlaylistSwitcher() {
	const playlists = usePlaylists();
	const { isMobile } = useSidebar();
	const router = useRouter();
	const pathname = usePathname();
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

	const setActivePlaylist = (playlist: Playlist) => {
		const basePath = section ? `/dashboard/${section}` : "/dashboard";
		if (playlist.id === NO_PLAYLIST_ID) {
			router.replace(basePath as any);
			return;
		}
		router.replace(`${basePath}/${playlist.id}`);
	};

	useEffect(() => {
		if (
			!activePlaylist ||
			activePlaylist.id === NO_PLAYLIST_ID ||
			playlistIdFromPath
		) {
			return;
		}
		const parts = pathname.split("/").filter(Boolean);
		const isNonPlaylistRoute =
			parts.length >= 2 &&
			NON_PLAYLIST_ROUTES.includes(
				parts[1] as (typeof NON_PLAYLIST_ROUTES)[number],
			);
		const isSearchSubRoute =
			PLAYLIST_SECTIONS.includes(
				parts[1] as (typeof PLAYLIST_SECTIONS)[number],
			) &&
			SEARCH_SUB_ROUTES.includes(
				(parts[2] ?? "") as (typeof SEARCH_SUB_ROUTES)[number],
			);
		if (isNonPlaylistRoute || isSearchSubRoute) {
			return;
		}
		const basePath = section ? `/dashboard/${section}` : "/dashboard";
		router.replace(`${basePath}/${activePlaylist.id}` as any);
	}, [activePlaylist, playlistIdFromPath, section, pathname, router]);

	if (!activePlaylist) {
		return null;
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
							<span className="truncate text-xs text-muted-foreground">
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
								Mes Playlists
							</DropdownMenuLabel>
							{playlists[0].id ===
							"NoPlaylisfreàçuhgpzfiru_thgrpituehgriptgrt" ? (
								<DropdownMenuItem className="gap-2 p-2 cursor-default">
									<div className="flex size-6 items-center justify-center rounded-md border">
										<ListVideoIcon className="size-4" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="truncate font-medium">Aucune playlist</div>
										<div className="truncate text-xs text-muted-foreground">
											Veuillez ajouter une playlist
										</div>
									</div>
								</DropdownMenuItem>
							) : (
								playlists.map((playlist, index) => (
									<DropdownMenuItem
										key={playlist.id}
										onClick={() => setActivePlaylist(playlist)}
										className="gap-2 p-2 cursor-pointer"
									>
										<div className="flex size-6 items-center justify-center rounded-md border">
											<ListVideoIcon className="size-4" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="truncate font-medium">
												{playlist.playlistName}
											</div>
											<div className="truncate text-xs text-muted-foreground">
												{playlist.username} · {playlist.serverUrl}
											</div>
										</div>
										<span className="ml-auto text-xs text-muted-foreground">
											{index + 1}
										</span>
										<Button
											variant="ghost"
											size="sm"
											disabled={isPending}
											className="ml-2 text-red-500  z-10000 cursor-pointer hover:text-red-600"
											onClick={(e) => {
												e.stopPropagation();
												startTransition(async () => {
													await deletePlaylistAction(playlist.id);
													router.replace("/dashboard");
												});
											}}
										>
											<Trash2Icon className="size-4" />
										</Button>
									</DropdownMenuItem>
								))
							)}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem className="gap-2 p-2 cursor-pointer">
								<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
									<PlusIcon className="size-4" />
								</div>
								<Link
									href="/dashboard/addplaylist"
									className="text-muted-foreground font-medium"
								>
									Ajouter une playlist
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
