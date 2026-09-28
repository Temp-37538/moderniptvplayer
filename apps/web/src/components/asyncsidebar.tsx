import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchPlaylists } from "@/server/queries";
import Sidebar from "./sidebar";

async function getPlaylists() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		return redirect("/auth/sign-in");
	}

	return fetchPlaylists();
}

export async function AsyncSidebar({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const playlists = await getPlaylists();

	return <Sidebar playlists={playlists}>{children}</Sidebar>;
}
