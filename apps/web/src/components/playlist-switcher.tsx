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
import { ChevronsUpDownIcon, ListVideoIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Playlist } from "./types";

export function PlaylistSwitcher({ playlists }: { playlists: Playlist[] }) {
  const { isMobile } = useSidebar();
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(
    playlists[0] || null,
  );

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
              {playlists.map((playlist, index) => (
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
                    ⌘{index + 1}
                  </span>
                </DropdownMenuItem>
              ))}
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
