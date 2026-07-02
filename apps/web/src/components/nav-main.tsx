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
	useSidebar,
} from "@/components/ui/sidebar";
import { usePlaylistIdFromPath } from "@/hooks/use-playlist-id";
import { ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
	title: string;
	url: string;
	icon?: React.ReactNode;
	isActive?: boolean;
	items?: {
		title: string;
		url: string;
	}[];
};

export function NavMain({
	items,
}: {
	items: NavItem[];
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
		<SidebarGroup>
			<SidebarGroupLabel>Platform</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
					<NavMainItem
						key={item.title}
						item={item}
						pathname={pathname}
						buildHref={buildHref}
						openMobile={openMobile}
						setOpenMobile={setOpenMobile}
					/>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

function NavMainItem({
	item,
	pathname,
	buildHref,
	openMobile,
	setOpenMobile,
}: {
	item: NavItem;
	pathname: string;
	buildHref: (url: string) => Route;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
}) {
	const isSubItemActive = item.items?.some((subItem) => {
		const subHref = buildHref(subItem.url);
		const isSearch = subItem.url.includes("/search");
		return isSearch
			? pathname === subHref || pathname.startsWith(`${subHref}/`)
			: (pathname === subHref || pathname.startsWith(`${subHref}/`)) && !pathname.includes("/search");
	});

	const [prevPathname, setPrevPathname] = useState(pathname);
	const [open, setOpen] = useState(!!(item.isActive || isSubItemActive));

	if (pathname !== prevPathname) {
		setPrevPathname(pathname);
		if (isSubItemActive) {
			setOpen(true);
		}
	}

	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className="group/collapsible"
			render={<SidebarMenuItem />}
		>
			<CollapsibleTrigger
				className="cursor-pointer"
				render={<SidebarMenuButton tooltip={item.title} />}
			>
				{item.icon}
				<span>{item.title}</span>
				<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<SidebarMenuSub>
					{item.items?.map((subItem) => {
						const subHref = buildHref(subItem.url);
						const isSearch = subItem.url.includes("/search");
						const isActive = isSearch
							? pathname === subHref || pathname.startsWith(`${subHref}/`)
							: (pathname === subHref || pathname.startsWith(`${subHref}/`)) && !pathname.includes("/search");

						return (
							<SidebarMenuSubItem key={subItem.title}>
								<SidebarMenuSubButton
									onClick={() => {
										openMobile && setOpenMobile(false);
									}}
									isActive={isActive}
									render={<Link href={subHref} />}
								>
									<span>{subItem.title}</span>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						);
					})}
				</SidebarMenuSub>
			</CollapsibleContent>
		</Collapsible>
	);
}

