import { createPageMetadata } from "@/app/metadata";
import HeroSection from "@/components/hero-section";
// import { SmokeBackground } from "@/components/spooky-smoke-animation";
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
			{/* <div className="absolute block dark:hidden w-full h-full">
				<SmokeBackground
					smokeColor="#A624FF"
					bgColor="#FBEAE6"
				/>
			</div>
			<div className="absolute hidden dark:block w-full h-full">
				<SmokeBackground
					smokeColor="#A624FF"
					bgColor="#141414"
				/>
			</div> */}
			<HeroSection />
		</div>
	);
}
