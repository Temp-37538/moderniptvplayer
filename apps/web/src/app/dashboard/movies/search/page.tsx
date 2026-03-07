import { createPageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata({
	title: "Search Movies",
	description:
		"Search movie categories across your playlists before browsing titles in detail.",
	path: "/dashboard/movies/search",
	noIndex: true,
});

function Page() {
	return <div>No playlists available</div>;
}

export default Page;
