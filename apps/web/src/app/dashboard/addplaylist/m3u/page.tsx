import { createPageMetadata } from "@/app/metadata";
import { M3UForm } from "@/components/m3u-form";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
	title: "Add M3U playlist",
	description: "Import an IPTV playlist from an M3U URL.",
	path: "/dashboard/addplaylist/m3u",
	noIndex: true,
});

function Page() {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-16">
			<div className="w-full max-w-md">
				<Link
					href="/dashboard/addplaylist"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-3.5" />
					Add a playlist
				</Link>

				<h1 className="mt-4 text-2xl font-bold tracking-tight">M3U URL</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Import live TV, movies, and series from an M3U link. Xtream username
					and password are not required. The URL is stored encrypted and is not
					shown again.
				</p>

				<div className="mt-8">
					<M3UForm />
				</div>
			</div>
		</div>
	);
}

export default Page;
