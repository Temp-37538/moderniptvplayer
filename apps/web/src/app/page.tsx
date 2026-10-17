import { createPageMetadata } from "@/app/metadata";
import HeroSection from "@/components/hero-section";
import { auth } from "@moderniptvplayer/auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getImageProps } from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Home",
	description:
		"Import IPTV playlists and instantly access live TV channels, movies, and series from a single streamlined, unified interface.",
	path: "/",
});

export default function Home() {
	const common = { alt: "", sizes: "100vw", quality: 75 };
	const {
		props: { srcSet: desktopSrcSet },
	} = getImageProps({
		...common,
		width: 2752,
		height: 1536,
		src: "/desktop-landing-page.webp",
	});
	const {
		props: { srcSet: mobileSrcSet, ...rest },
	} = getImageProps({
		...common,
		width: 864,
		height: 1536,
		src: "/mobile-landing-page.webp",
	});

	return (
		<div className="relative flex min-h-svh w-full flex-col gap-4 overflow-hidden bg-background">
			<picture className="absolute inset-0">
				<source media="(max-width: 767px)" srcSet={mobileSrcSet} />
				<source media="(min-width: 768px)" srcSet={desktopSrcSet} />
				<img
					{...rest}
					className="absolute inset-0 size-full object-cover object-top"
					fetchPriority="high"
					alt=""
				/>
			</picture>
			<Suspense fallback={null}>
				<HomeGate />
			</Suspense>
		</div>
	);
}

async function HomeGate() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session?.user.id) {
		redirect("/dashboard");
	} else {
		return <HeroSection />;
	}
}
