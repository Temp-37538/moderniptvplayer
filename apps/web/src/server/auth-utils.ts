import "server-only";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";
 
export async function getAuthenticatedUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.id) {
		throw new Error("User not authenticated");
	}

	return session.user.id;
}
