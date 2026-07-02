import dotenv from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

const envFile =
	process.env.NODE_ENV === "production"
		? ".env.production"
		: ".env.development";

dotenv.config({
	path: path.resolve("../../apps/web", envFile),
});

export default defineConfig({
	schema: path.join("prisma", "schema"),
	migrations: {
		path: path.join("prisma", "migrations"),
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
