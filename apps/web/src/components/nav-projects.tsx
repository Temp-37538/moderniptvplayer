"use client";
import type { Project } from "@/components/types";
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
import { useEffect, useState } from "react";

/** "⌘" on Apple platforms, "Ctrl" elsewhere, read after mount. */
function useModifierLabel() {
	const [label, setLabel] = useState("Ctrl");

	useEffect(() => {
		if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
			setLabel("⌘");
		}
	}, []);

	return label;
}

export function NavProjects({ projects }: { projects: Project[] }) {
	const pathname = usePathname();
	const { playlistId } = usePlaylistIdFromPath();
	const { setOpenMobile, openMobile } = useSidebar();
	const modifier = useModifierLabel();

	function buildHref(url: string): Route {
		if (!playlistId) return url as Route;
		if (url.startsWith("/dashboard/")) return `${url}/${playlistId}` as Route;
		return url as Route;
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Library</SidebarGroupLabel>
			<SidebarMenu>
				{projects.map((item) => {
					const href = buildHref(item.url);
					const isActive = pathname === href || pathname.startsWith(`${href}/`);
					const shortcut = item.shortcut
						? `${modifier} ${item.shortcut}`
						: undefined;
					return (
						<SidebarMenuItem key={item.name}>
							<SidebarMenuButton
								tooltip={shortcut ? `${item.name} (${shortcut})` : item.name}
								onClick={() => {
									openMobile && setOpenMobile(false);
								}}
								isActive={isActive}
								render={<Link href={href} />}
							>
								{item.icon}
								<span>{item.name}</span>
								{shortcut ? (
									<kbd className="ml-auto rounded border border-sidebar-border px-1.5 font-sans text-[0.65rem] text-muted-foreground group-data-[collapsible=icon]:hidden">
										{shortcut}
									</kbd>
								) : null}
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
