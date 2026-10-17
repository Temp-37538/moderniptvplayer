import { createPageMetadata } from "@/app/metadata";
import { XtreamCodesForm } from "@/components/xtream-form";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Add Xtream Playlist",
	description:
		"Connect a playlist with Xtream Codes credentials to start browsing channels, movies, and series.",
	path: "/dashboard/addplaylist/xtream",
	noIndex: true,
});

function Page() {
	return (
		<div className="flex flex-1 flex-col px-4 pt-2 pb-16">
			<div className="w-full max-w-md">
				<Link
					href="/dashboard/addplaylist"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-3.5" />
					Add a playlist
				</Link>

				<h1 className="mt-4 text-2xl font-bold tracking-tight">Xtream Codes</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Connect with the server URL, username and password from your IPTV
					provider.
				</p>

				<div className="mt-8">
					<XtreamCodesForm />
				</div>
			</div>
		</div>
	);
}

export default Page;
