import "server-only";
import { auth } from "@moderniptvplayer/auth";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const getAuthenticatedUserId = cache(
	async (): Promise<string | null> => {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		return session?.user.id ?? null;
	},
);

export async function requireAuthenticatedUserId(): Promise<string> {
	const userId = await getAuthenticatedUserId();
	if (!userId) {
		redirect("/auth/sign-in");
	}
	return userId;
}
