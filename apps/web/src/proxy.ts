import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@moderniptvplayer/auth";

export const config = {
	matcher: [
		"/dashboard/:path*",
		"/api/movies/search",
		"/api/channels/search",
		"/api/series/search",
		"/api/image-proxy",
	],
};

export async function proxy(request: NextRequest) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user.id) {
		if (request.nextUrl.pathname.startsWith("/dashboard")) {
			const signInUrl = new URL("/auth/sign-in", request.url);
			signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
			return NextResponse.redirect(signInUrl);
		}
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		);
	}

	return NextResponse.next();
}
