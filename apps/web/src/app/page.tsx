import { createPageMetadata } from "@/app/metadata";
import HeroSection from "@/components/hero-section";
import { SmokeBackground } from "@/components/spooky-smoke-animation";
import type { Metadata } from "next";

export const metadata: Metadata = createPageMetadata({
	title: "Home",
	description:
		"Import IPTV playlists and instantly access live TV channels, movies, and series from a single streamlined, unified interface.",
	path: "/",
});

export default function Home() {
	return (
		<div className="flex h-full w-full flex-col gap-4 bg-background overflow-hidden">
			<div className="absolute inset-0">
				<SmokeBackground smokeColor="#A624FF" mode="light"  />
			</div>

			<div className="absolute inset-0 hidden dark:block">
				<SmokeBackground smokeColor="#A624FF" mode="dark"  />
			</div>
			<HeroSection />
		</div>
	);
}
