import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaylistSwitcher } from "@/components/playlist-switcher";
import { sidebarData } from "@/components/types";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import type * as React from "react";
import { UserButton } from "./auth/user/user-button";
import { ModeToggle } from "./mode-toggle";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { state, isMobile } = useSidebar();
	const collapsed = state === "collapsed" && !isMobile;

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader className="h-16 justify-center">
				<div className="flex items-center justify-end gap-1">
					<div className="min-w-0 flex-1 transition-opacity duration-200 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
						<PlaylistSwitcher />
					</div>
					<SidebarTrigger
						className={
							collapsed
								? "size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:brightness-90 hover:text-sidebar-primary-foreground dark:hover:bg-sidebar-primary dark:hover:text-sidebar-primary-foreground"
								: undefined
						}
					/>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={sidebarData.navMain} />
				<NavProjects projects={sidebarData.projects} />
			</SidebarContent>
			<SidebarFooter
				className={`relative overflow-hidden transition-[height] duration-200 ease-linear border-t-2 ${collapsed ? "h-[104px]" : "h-16"}`}
			>
				<div
					className={`absolute transition-[left,top] duration-200 ease-linear ${collapsed ? "left-[calc(50%-16px)] top-4" : "left-[calc(50%-36px)] top-4"}`}
				>
					<UserButton size="icon" />
				</div>
				<div
					className={`absolute transition-[left,top] duration-200 ease-linear ${collapsed ? "left-[calc(50%-16px)] top-14" : "left-[calc(50%+4px)] top-4"}`}
				>
					<ModeToggle />
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
