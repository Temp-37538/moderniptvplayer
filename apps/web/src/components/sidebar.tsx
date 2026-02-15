"use client";
import { authClient } from "@/lib/auth-client";
import { SignedIn } from "@daveyplate/better-auth-ui";
import { House } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";

function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 z-10 shrink-0 justify-between items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink>Modern IPTV Player</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {pathname.split("/").length > 0
                      ? pathname.split("/")[1].charAt(0).toUpperCase() +
                        pathname.split("/")[1].slice(1)
                      : "Home"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Button className={"p-0"} variant="outline" size="sm">
              <Link className="py-4 px-4 m-0" href="/home">
                <House />
              </Link>
            </Button>
            <SignedIn>
              <Button
                onClick={handleLogout}
                size={"sm"}
                className="cursor-pointer w-fit  "
              >
                Logout
              </Button>
            </SignedIn>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </>
  );
}

export default Sidebar;
