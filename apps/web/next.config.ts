import "@moderniptvplayer/env/web";
import type { NextConfig } from "next";

// Conservative on purpose: no script-src/style-src, which would need a
// nonce-based setup for Next.js. These directives do not affect rendering.
const contentSecurityPolicy = [
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"object-src 'none'",
	// Trailers are the only embedded frames. vercel.live is the preview toolbar.
	"frame-src https://www.youtube.com https://www.youtube-nocookie.com https://vercel.live",
].join("; ");

const nextConfig: NextConfig = {
	cacheComponents: true,
	typedRoutes: true,
	reactCompiler: true,
	agentRules: false,
	poweredByHeader: false,
	images: {
		localPatterns: [
			{ pathname: "/api/image-proxy" },
			{ pathname: "/desktop-landing-page.webp" },
			{ pathname: "/mobile-landing-page.webp" },
			{ pathname: "/background.webp" },
		],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value:
							"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=31536000",
					},
				],
			},
			{
				// The image proxy sets its own, stricter, policy.
				source: "/((?!api/image-proxy).*)",
				headers: [
					{
						key: "Content-Security-Policy",
						value: contentSecurityPolicy,
					},
				],
			},
		];
	},
};

export default nextConfig;
