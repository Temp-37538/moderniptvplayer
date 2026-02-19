"use client";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon?: React.ReactNode;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	}[];
}) {
	const pathname = usePathname();
	const parts = pathname.split("/").filter(Boolean);
	const PLAYLIST_SECTIONS = ["channels", "movies", "series"];
	const NON_PLAYLIST_ROUTES = ["addplaylist", "account"];
	const ALL_SUB_ROUTES = ["all"];

	let playlistId: string | null = null;
	if (parts.length >= 3 && PLAYLIST_SECTIONS.includes(parts[1])) {
		if (ALL_SUB_ROUTES.includes(parts[2])) {
			playlistId = parts[3] ?? null;
		} else {
			playlistId = parts[2];
		}
	} else if (
		parts.length === 2 &&
		!PLAYLIST_SECTIONS.includes(parts[1]) &&
		!NON_PLAYLIST_ROUTES.includes(parts[1])
	) {
		playlistId = parts[1];
	}

	function buildHref(url: string) {
		if (!url) return url;
		if (!playlistId) return url;
		if (url.startsWith("/dashboard/")) return `${url}/${playlistId}`;
		return url;
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Platform</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
					<Collapsible
						key={item.title}
						defaultOpen={item.isActive}
						className="group/collapsible"
						render={<SidebarMenuItem />}
					>
						<CollapsibleTrigger
							className={"cursor-pointer"}
							render={<SidebarMenuButton tooltip={item.title} />}
						>
							{item.icon}
							<span>{item.title}</span>
							<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
						</CollapsibleTrigger>
						<CollapsibleContent>
							<SidebarMenuSub>
								{item.items?.map((subItem) => (
									<SidebarMenuSubItem key={subItem.title}>
										<SidebarMenuSubButton
											render={<Link href={buildHref(subItem.url) as string} />}
										>
											<span>{subItem.title}</span>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								))}
							</SidebarMenuSub>
						</CollapsibleContent>
					</Collapsible>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
