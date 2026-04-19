import prisma from "@moderniptvplayer/db";
import { env } from "@moderniptvplayer/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	secrets: [
		{ version: 2, value: env.BETTER_AUTH_SECRET2 },
		{ version: 1, value: env.BETTER_AUTH_SECRET },
	],
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	plugins: [nextCookies()],
});
