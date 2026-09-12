import { createPageMetadata } from "@/app/metadata";
import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
