import "server-only";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getAuthenticatedUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		redirect("/auth/sign-in");
	}

	return session.user.id;
}
