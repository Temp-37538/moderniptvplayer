import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePlaylistIdFromPath } from "@/hooks/use-playlist-id";
import type { Route } from "next";
import Link from "next/link";

export function NavProjects({
	projects,
}: {
	projects: {
		name: string;
		url: string;
		icon: React.ReactNode;
	}[];
}) {
	const { playlistId } = usePlaylistIdFromPath();

	function buildHref(url: string): Route {
		if (!playlistId) return url as Route;
		if (url.startsWith("/dashboard/")) return `${url}/${playlistId}` as Route;
		return url as Route;
	}

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>Projects</SidebarGroupLabel>
			<SidebarMenu>
				{projects.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton render={<Link href={buildHref(item.url)} />}>
							{item.icon}
							<span>{item.name}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
