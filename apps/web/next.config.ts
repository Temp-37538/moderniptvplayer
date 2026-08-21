import "@moderniptvplayer/env/web";
import type { NextConfig } from "next";
 
const nextConfig: NextConfig = {
	cacheComponents: true,
	typedRoutes: true,
	reactCompiler: true,
	images: {
		localPatterns: [
			{ pathname: "/api/image-proxy" },
			{ pathname: "/desktop-landing-page.webp" },
			{ pathname: "/mobile-landing-page.webp" },
			{ pathname: "/background.webp" },
		],
	},
};

export default nextConfig;
