"use client";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "./ui/skeleton";

function SkeletonSidebar({ children }: { children: React.ReactNode }) {
	const { state, isMobile } = useSidebar();
	const collapsed = state === "collapsed" && !isMobile;
	return (
		<>
			<Sidebar collapsible="icon">
				<SidebarHeader className="h-16 justify-center">
					<div className="flex items-center justify-end gap-1">
						<div className="min-w-0 flex-1">
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton size="lg" className="pointer-events-none">
										<Skeleton className="size-8 rounded-lg shrink-0" />
										<div className="grid flex-1 gap-1.5 text-left">
											<Skeleton className="h-3.5 w-24 rounded" />
											<Skeleton className="h-2.5 w-32 rounded" />
										</div>
										<Skeleton className="ml-auto size-4 rounded shrink-0" />
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</div>
						<Skeleton className="size-8 rounded-lg shrink-0" />
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>
							<Skeleton className="h-3 w-16 rounded" />
						</SidebarGroupLabel>
						{/* TV, Movies and Series, collapsed as on first load. */}
						<SidebarMenu>
							{["w-8", "w-14", "w-12"].map((width, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: "Index is acceptable here since items are static placeholders"
								<SidebarMenuItem key={i}>
									<SidebarMenuButton className="pointer-events-none">
										<Skeleton className="size-4 rounded shrink-0" />
										<Skeleton className={`h-3.5 ${width} rounded`} />
										<Skeleton className="ml-auto size-3.5 rounded shrink-0" />
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>
							<Skeleton className="h-3 w-14 rounded" />
						</SidebarGroupLabel>
						{/* Search (with its shortcut), Watch Later, Favorites. */}
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton className="pointer-events-none">
									<Skeleton className="size-4 rounded shrink-0" />
									<Skeleton className="h-3.5 w-12 rounded" />
									<Skeleton className="ml-auto h-4 w-9 rounded group-data-[collapsible=icon]:hidden" />
								</SidebarMenuButton>
							</SidebarMenuItem>
							{["w-20", "w-16"].map((width, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: "Index is acceptable here since items are static placeholders"
								<SidebarMenuItem key={i}>
									<SidebarMenuButton className="pointer-events-none">
										<Skeleton className="size-4 rounded shrink-0" />
										<Skeleton className={`h-3.5 ${width} rounded`} />
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter
					className={`relative overflow-hidden border-t-2 ${collapsed ? "h-[104px]" : "h-16"}`}
				>
					<div
						className={`absolute ${collapsed ? "left-[calc(50%-16px)] top-4" : "left-[calc(50%-36px)] top-4"}`}
					>
						<Skeleton className="size-8 rounded-full" />
					</div>
					<div
						className={`absolute ${collapsed ? "left-[calc(50%-16px)] top-14" : "left-[calc(50%+4px)] top-4"}`}
					>
						<Skeleton className="size-8 rounded-full" />
					</div>
				</SidebarFooter>
			</Sidebar>
			{/* min-w-0: wide page content must not push the inset past the viewport. */}
			<SidebarInset className="min-w-0">
				<header className="flex h-16 z-10 shrink-0 justify-between items-center gap-2 border-b px-6 md:px-8 lg:px-10">
					<div className="flex items-center gap-2">
						<Skeleton className="hidden md:block h-4 w-32 rounded" />
						<Skeleton className="hidden md:block h-4 w-4 rounded" />
						<Skeleton className="h-4 w-24 rounded" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="size-8 rounded-md" />
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pt-6 md:px-8 lg:px-10">
					{children}
				</div>
			</SidebarInset>
		</>
	);
}

export default SkeletonSidebar;
