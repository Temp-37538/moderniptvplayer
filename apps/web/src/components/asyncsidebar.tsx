import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "../../../../packages/db/src/index";
import Sidebar from "./sidebar";
import { sidebarData } from "./types";

async function fetchPlaylists() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		return redirect("/auth/sign-in");
	}

	try {
		const playlists = await prisma.playlist.findMany({
			where: {
				userId: session.user.id,
			},
		});

		if (playlists.length === 0) {
			return sidebarData.playlists;
		}

		return playlists;
	} catch (error) {
		console.error("Error fetching playlists:", error);
		throw new Error("Failed to fetch playlists");
	}
}

export async function AsyncSidebar({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const playlists = await fetchPlaylists(); 

	return <Sidebar playlists={playlists}>{children}</Sidebar>;
}
