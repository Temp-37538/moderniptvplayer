"use client";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { usePlaylistIdFromPath } from "@/hooks/use-playlist-id";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavProjects({
	projects,
}: {
	projects: {
		name: string;
		url: string;
		icon: React.ReactNode;
	}[];
}) {
	const pathname = usePathname();
	const { playlistId } = usePlaylistIdFromPath();
	const { setOpenMobile, openMobile } = useSidebar();

	function buildHref(url: string): Route {
		if (!playlistId) return url as Route;
		if (url.startsWith("/dashboard/")) return `${url}/${playlistId}` as Route;
		return url as Route;
	}
	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>Projects</SidebarGroupLabel>
			<SidebarMenu>
				{projects.map((item) => {
					const builtHref = buildHref(item.url);
					const isActive = pathname === builtHref || pathname.startsWith(`${builtHref}/`);
					return (
						<SidebarMenuItem key={item.name}>
							<SidebarMenuButton
								onClick={() => {
									openMobile && setOpenMobile(false);
								}}
								isActive={isActive}
								render={<Link href={builtHref} />}
							>
								{item.icon}
								<span>{item.name}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}

