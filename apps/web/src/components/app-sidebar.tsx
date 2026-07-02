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
import { UserButton } from "./auth/user/user-button";
import { ModeToggle } from "./mode-toggle";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { state,  } = useSidebar(); 

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<PlaylistSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={sidebarData.navMain} />
				<NavProjects projects={sidebarData.projects} />
			</SidebarContent>
			<SidebarFooter
				className={`flex items-center gap-2 py-4 border-t-2 justify-center ${state === "collapsed" ? "flex-col" : ""}`}
			>
				<UserButton size="icon" />
				<ModeToggle />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
