import Sidebar from "@/components/sidebar";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import { Suspense } from "react";
import prisma from "../../../../../packages/db/src/index";
import { sidebarData } from "@/components/types";

async function fetchPlaylists() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    throw new Error("User not authenticated");
  }

  try {
    const playlists = await prisma.playlist.findMany({
      where: {
        userId: session.user.id,
      },
    });
    return playlists;
  } catch (error) {
    console.error("Error fetching playlists:", error);
    throw new Error("Failed to fetch playlists");
  }
}

async function AsyncSidebar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const playlists = await fetchPlaylists();
  return <Sidebar playlists={playlists}>{children}</Sidebar>;
}

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <Sidebar playlists={sidebarData.playlists} children={children} />
      }
    >
      <AsyncSidebar>{children}</AsyncSidebar>
    </Suspense>
  );
}
