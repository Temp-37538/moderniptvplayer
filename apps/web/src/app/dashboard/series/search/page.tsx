import { createPageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata({
	title: "Search Series",
	description:
		"Search series categories across your playlists before opening shows and seasons.",
	path: "/dashboard/series/search",
	noIndex: true,
});

function Page() {
	return <div>No playlists available</div>;
}

export default Page;
