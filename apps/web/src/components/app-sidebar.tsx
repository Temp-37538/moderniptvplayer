import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaylistSwitcher } from "@/components/playlist-switcher";
import { sidebarData } from "@/components/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type * as React from "react";
import { ModeToggle } from "./mode-toggle";
import { SignedIn } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "./ui/button";

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
        className={`flex items-center gap-2 py-4 border-t-2 justify-center ${state === "collapsed" ? "transition-transform flex-col" : ""}`}
      >
        <SignedIn>
          <Button className={"p-0"} variant="outline" size="icon">
            <Link className="py-4 px-4 m-0" href="/account/settings">
              <Settings />
            </Link>
          </Button>
        </SignedIn> 
        <ModeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
