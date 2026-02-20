"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

function SkeletonSidebar({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
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
                    <SidebarMenuSubItem key={`sub-${i}`}>
                      <SidebarMenuSubButton className="pointer-events-none">
                        <Skeleton className="h-3 w-24 rounded" />
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem> 
              {Array.from({ length: 2 }).map((_, i) => (
                <SidebarMenuItem key={`nav-${i}`}>
                  <SidebarMenuButton className="pointer-events-none">
                    <Skeleton className="size-4 rounded shrink-0" />
                    <Skeleton className="h-3.5 w-20 rounded" />
                    <Skeleton className="ml-auto size-3.5 rounded shrink-0" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>  
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>
              <Skeleton className="h-3 w-14 rounded" />
            </SidebarGroupLabel>
            <SidebarMenu> 
              {Array.from({ length: 3 }).map((_, i) => (
                <SidebarMenuItem key={`proj-${i}`}>
                  <SidebarMenuButton className="pointer-events-none">
                    <Skeleton className="size-4 rounded shrink-0" />
                    <Skeleton className="h-3.5 w-24 rounded" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))} 
              <SidebarMenuItem>
                <SidebarMenuButton className="pointer-events-none">
                  <Skeleton className="size-4 rounded shrink-0" />
                  <Skeleton className="h-3.5 w-12 rounded" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent> 
        <SidebarFooter className="flex items-center gap-2 py-4 border-t-2 justify-center">
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="h-8 w-10 rounded-md" />  
        </SidebarFooter>

        <SidebarRail />
      </Sidebar> 
      <SidebarInset>
        <header className="flex h-16 z-10 shrink-0 justify-between items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <div className="flex items-center gap-2">
              <Skeleton className="hidden md:block h-4 w-32 rounded" />
              <Skeleton className="hidden md:block h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2"> 
            <Skeleton className="h-8 w-12 rounded-md" /> 
            <Skeleton className="h-8 w-17 rounded-md" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">{children}</div>
      </SidebarInset>
    </>
  );
}

export default SkeletonSidebar;
