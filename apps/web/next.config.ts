import "@moderniptvplayer/env/web";
import type { NextConfig } from "next";

const routeSections = ["channels", "movies", "series"] as const;

const legacyAllRedirects = routeSections.flatMap((section) => [
	{
		source: `/dashboard/${section}/all`,
		destination: `/dashboard/${section}/search`,
		permanent: false,
	},
	{
		source: `/dashboard/${section}/all/:id`,
		destination: `/dashboard/${section}/search/:id`,
		permanent: false,
	},
	{
		source: `/dashboard/${section}/all/:id/:categoryId`,
		destination: `/dashboard/${section}/search/:id/:categoryId`,
		permanent: false,
	},
]);

const nextConfig: NextConfig = { 
	cacheComponents: true,
	typedRoutes: true,
	reactCompiler: true, 
	typescript: {
		ignoreBuildErrors: true,
	},
	async redirects() {
		return legacyAllRedirects;
	},
};

export default nextConfig;
