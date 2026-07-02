import { createPageMetadata } from "@/app/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = createPageMetadata({
	title: "Add M3U Playlist",
	description: "Import an IPTV playlist from an M3U URL.",
	path: "/dashboard/addplaylist/m3u",
	noIndex: true,
});

function Page() {
	return <div>Page under construction. Please check back later.</div>;
}

export default Page;
