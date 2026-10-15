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
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
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
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton className="pointer-events-none">
									<Skeleton className="size-4 rounded shrink-0" />
									<Skeleton className="h-3.5 w-20 rounded" />
									<Skeleton className="ml-auto size-3.5 rounded shrink-0" />
								</SidebarMenuButton>
								<SidebarMenuSub>
									{Array.from({ length: 2 }).map((_, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: "Index is acceptable here since items are static placeholders"
										<SidebarMenuSubItem key={i}>
											<SidebarMenuSubButton className="pointer-events-none">
												<Skeleton className="h-3 w-24 rounded" />
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									))}
								</SidebarMenuSub>
							</SidebarMenuItem>
							{Array.from({ length: 2 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: "Index is acceptable here since items are static placeholders"
								<SidebarMenuItem key={i}>
									<SidebarMenuButton className="pointer-events-none">
										<Skeleton className="size-4 rounded shrink-0" />
										<Skeleton className="h-3.5 w-20 rounded" />
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
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton className="pointer-events-none">
									<Skeleton className="size-4 rounded shrink-0" />
									<Skeleton className="h-3.5 w-24 rounded" />
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="pointer-events-none">
									<Skeleton className="size-4 rounded shrink-0" />
									<Skeleton className="h-3.5 w-12 rounded" />
								</SidebarMenuButton>
							</SidebarMenuItem>
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
			<SidebarInset>
				<header className="flex h-16 z-10 shrink-0 justify-between items-center gap-2 border-b px-4">
					<div className="flex items-center gap-2">
						<Skeleton className="hidden md:block h-4 w-32 rounded" />
						<Skeleton className="hidden md:block h-4 w-4 rounded" />
						<Skeleton className="h-4 w-24 rounded" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-12 rounded-md" />
						<Skeleton className="h-8 w-17 rounded-md" />
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
					{children}
				</div>
			</SidebarInset>
		</>
	);
}

export default SkeletonSidebar;
