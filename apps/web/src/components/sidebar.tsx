"use client";
import { usePlaylistIdFromPath } from "@/hooks/use-playlist-id";
import { buildBreadcrumbs } from "@/lib/breadcrumbs";
import { cn } from "@/lib/utils";
import { House } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { AppSidebar } from "./app-sidebar";
import {
	BreadcrumbLabelsProvider,
	useBreadcrumbLabels,
} from "./breadcrumb-labels";
import { PlaylistProvider, usePlaylists } from "./playlist-context";
import type { Playlist } from "./types";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Button } from "./ui/button";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";

function Sidebar({
	children,
	playlists,
}: {
	children: React.ReactNode;
	playlists: Playlist[];
}) {
	return (
		<PlaylistProvider playlists={playlists}>
			<BreadcrumbLabelsProvider>
				<SidebarContent>{children}</SidebarContent>
			</BreadcrumbLabelsProvider>
		</PlaylistProvider>
	);
}

/** Ctrl+K (Cmd+K on macOS) opens the global search of the current playlist. */
function useSearchShortcut() {
	const router = useRouter();
	const { playlistId } = usePlaylistIdFromPath();

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (
				event.key.toLowerCase() !== "k" ||
				!(event.metaKey || event.ctrlKey) ||
				event.altKey ||
				event.shiftKey
			) {
				return;
			}
			event.preventDefault();
			router.push(
				(playlistId
					? `/dashboard/search/${playlistId}`
					: "/dashboard/search") as Route,
			);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [playlistId, router]);
}

function SidebarContent({ children }: { children: React.ReactNode }) {
	const playlists = usePlaylists();
	const pathname = usePathname();
	const labels = useBreadcrumbLabels();
	const crumbs = buildBreadcrumbs(pathname, playlists, labels);

	useSearchShortcut();

	return (
		<>
			<AppSidebar />
			{/* min-w-0: wide page content must not push the inset past the viewport. */}
			<SidebarInset className="min-w-0">
				<header className="flex h-16 z-10 shrink-0 justify-between items-center gap-2 border-b px-6 md:px-8 lg:px-10">
					<div className="flex min-w-0 items-center gap-2">
						<SidebarTrigger className="-ml-1 size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:brightness-90 hover:text-sidebar-primary-foreground dark:hover:bg-sidebar-primary dark:hover:text-sidebar-primary-foreground md:hidden" />
						<Breadcrumb className="min-w-0">
							{/* One line: the middle crumbs only show from lg up. */}
							<BreadcrumbList className="flex-nowrap">
								{crumbs.map((crumb, index) => {
									const isLast = index === crumbs.length - 1;
									const isCurrent = isLast && crumb.href === pathname;
									const isMiddle = index > 0 && index < crumbs.length - 2;

									return (
										<React.Fragment key={crumb.href}>
											<BreadcrumbItem
												className={cn(
													"hidden min-w-0",
													isMiddle ? "lg:inline-flex" : "md:inline-flex",
												)}
											>
												{isCurrent ? (
													<BreadcrumbPage className="max-w-48 truncate">
														{crumb.label}
													</BreadcrumbPage>
												) : crumb.link ? (
													<BreadcrumbLink
														className="max-w-48 truncate"
														render={<Link href={crumb.href as Route} />}
													>
														{crumb.label}
													</BreadcrumbLink>
												) : (
													<span className="max-w-48 truncate">
														{crumb.label}
													</span>
												)}
											</BreadcrumbItem>
											{!isLast && (
												<BreadcrumbSeparator
													className={cn(
														"hidden",
														isMiddle ? "lg:block" : "md:block",
													)}
												/>
											)}
										</React.Fragment>
									);
								})}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Home"
							nativeButton={false}
							render={<Link href={"/dashboard" as Route} />}
						>
							<House className="size-4" />
						</Button>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pt-6 md:px-8 lg:px-10">
					{children}
				</div>
			</SidebarInset>
		</>
	);
}

export default Sidebar;
