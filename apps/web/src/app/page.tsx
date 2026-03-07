import { createPageMetadata } from "@/app/metadata";
import HeroSection from "@/components/hero-section";

export const metadata = createPageMetadata({
	title: "Home",
	description:
		"Import IPTV playlists and browse live TV, movies, and series from one streamlined dashboard.",
	path: "/",
});

export default function Home() {
	return (
		<div className="flex h-full w-full flex-col gap-4 overflow-hidden">
			<HeroSection />
		</div>
	);
}
