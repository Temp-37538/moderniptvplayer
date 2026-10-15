import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		SECRET_KEY: z.string().min(16),
		// Playlist servers are contacted from the server. Private and loopback
		// addresses are refused unless this is enabled (LAN-only setups).
		ALLOW_PRIVATE_PLAYLIST_HOSTS: z
			.enum(["true", "false"])
			.default("false")
			.transform((value) => value === "true"),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
