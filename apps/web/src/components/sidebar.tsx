"use client";
import { authClient } from "@/lib/auth-client";
import { SignedIn } from "@daveyplate/better-auth-ui";
import { House } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { AppSidebar } from "./app-sidebar";
import { PlaylistProvider, usePlaylists } from "./playlist-context";
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
import type { Playlist } from "./types";
import type { Route } from "next";

function Sidebar({
	children,
	playlists,
}: {
	children: React.ReactNode;
	playlists: Playlist[];
}) {
	return (
		<PlaylistProvider playlists={playlists}>
			<SidebarContent>{children}</SidebarContent>
		</PlaylistProvider>
	);
}

function SidebarContent({ children }: { children: React.ReactNode }) {
	const playlists = usePlaylists();
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
								{pathname
									.split("/")
									.filter(Boolean)
									.map((segment, index, array) => {
										const href = `/${array.slice(0, index + 1).join("/")}`;
										const isLast = index === array.length - 1;
										let label = segment;

										if (segment === "dashboard") label = "Home";
										if (segment === "channels") label = "Channels";
										if (segment === "movies") label = "Movies";
										if (segment === "series") label = "Series";

										const playlist = playlists?.find((p) => p.id === segment);
										
										if (playlist) {
											label = playlist.playlistName;
										} else if (index > 0) {
											const prevSegment = array[index - 1];
											const prevPlaylist = playlists?.find(
												(p) => p.id === prevSegment,
											);
											if (prevPlaylist) {
												label = `Category ${segment}`;
											}
										}

										label = label.charAt(0).toUpperCase() + label.slice(1);

										return (
											<React.Fragment key={href}>
												<BreadcrumbItem className="hidden md:block">
													{!isLast ? (
														<BreadcrumbLink
															render={<Link href={href as Route} />}
														>
															{label} 
														</BreadcrumbLink>
													) : (
														<BreadcrumbPage>{label}</BreadcrumbPage>
													)}
												</BreadcrumbItem>
												{!isLast && (
													<BreadcrumbSeparator className="hidden md:block" />
												)}
											</React.Fragment>
										);
									})}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="flex items-center gap-2">
						<Button className={"p-0"} variant="outline" size="sm">
							<Link className="py-4 px-4 m-0" href={"/dashboard" as Route}>
								<House />
							</Link>
						</Button>
						<SignedIn>
							<Button
								onClick={handleLogout}
								size={"sm"}
								className=" w-fit  "
							>
								Logout
							</Button>
						</SignedIn>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
					{children}
				</div>
			</SidebarInset>
		</>
	);
}

export default Sidebar;
export { SidebarContent };
