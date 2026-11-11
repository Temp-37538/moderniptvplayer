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
import { useEffect, useState } from "react";

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

const NAV_OPEN_STORAGE_KEY = "sidebar-nav-open-items";

function readOpenNavItems(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(NAV_OPEN_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((value): value is string => typeof value === "string")
			: [];
	} catch {
		return [];
	}
}

function writeOpenNavItems(items: string[]) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(NAV_OPEN_STORAGE_KEY, JSON.stringify(items));
	} catch {
		// Ignore storage failures.
	}
}

function setNavItemOpen(title: string, next: boolean) {
	const current = readOpenNavItems();
	if (next) {
		if (!current.includes(title)) {
			writeOpenNavItems([...current, title]);
		}
	} else {
		writeOpenNavItems(current.filter((value) => value !== title));
	}
}

export function NavMain({ items }: { items: NavItem[] }) {
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
			<SidebarGroupLabel>Browse</SidebarGroupLabel>
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
	const { state, setOpen: setSidebarOpen } = useSidebar();

	const [open, setOpen] = useState(false);

	useEffect(() => {
		setOpen(readOpenNavItems().includes(item.title));
	}, [item.title]);

	return (
		<Collapsible
			open={open}
			onOpenChange={(next) => {
				if (state === "collapsed") {
					setSidebarOpen(true);
					setOpen(true);
					setNavItemOpen(item.title, true);
					return;
				}
				setOpen(next);
				setNavItemOpen(item.title, next);
			}}
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
				<div className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-linear group-data-[collapsible=icon]:grid-rows-[0fr] group-data-[collapsible=icon]:opacity-0">
					<SidebarMenuSub className="flex min-h-0 overflow-hidden group-data-[collapsible=icon]:flex">
						{item.items?.map((subItem) => {
							const subHref = buildHref(subItem.url);
							const isSearch = subItem.url.includes("/search");
							const isActive = isSearch
								? pathname === subHref || pathname.startsWith(`${subHref}/`)
								: (pathname === subHref ||
										pathname.startsWith(`${subHref}/`)) &&
									!pathname.includes("/search");

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
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
