import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaylistSwitcher } from "@/components/team-switcher";
import { sidebarData } from "@/components/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserButton } from "@daveyplate/better-auth-ui";
import type * as React from "react";
import { ModeToggle } from "./mode-toggle";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <PlaylistSwitcher playlists={sidebarData.playlists} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarData.navMain} />
        <NavProjects projects={sidebarData.projects} />
      </SidebarContent>
      <SidebarFooter
        className={`flex items-center gap-2 py-4 border-t-2 justify-center ${state === "collapsed" ? "transition-transform  flex-col" : ""}`}
      >
        <ModeToggle />
        <UserButton variant={"default"} size={"icon"} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
