import { createPageMetadata } from "@/app/metadata";
import HeroSection from "@/components/hero-section";
import { SmokeBackground } from "@/components/spooky-smoke-animation";
import { auth } from "@moderniptvplayer/auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = createPageMetadata({
	title: "Home",
	description:
		"Import IPTV playlists and instantly access live TV channels, movies, and series from a single streamlined, unified interface.",
	path: "/",
});

export default function Home() {
	return (
		<div className="flex h-full w-full flex-col gap-4 overflow-hidden bg-background">
			<div className="absolute inset-0">
				<SmokeBackground smokeColor="#A624FF" mode="light" />
			</div>
			<div className="absolute inset-0 hidden dark:block">
				<SmokeBackground smokeColor="#A624FF" mode="dark" />
			</div>
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
