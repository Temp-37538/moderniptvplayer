import { createPageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata({
	title: "Search Channels",
	description:
		"Search channel categories across your playlists before drilling into individual streams.",
	path: "/dashboard/channels/search",
	noIndex: true,
});

function Page() {
	return <div>No playlists available</div>;
}

export default Page;
