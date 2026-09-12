import { createPageMetadata } from "@/app/metadata";
import { XtreamCodesForm } from "@/components/xtream-form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = createPageMetadata({
	title: "Add Xtream Playlist",
	description:
		"Connect a playlist with Xtream Codes credentials to start browsing channels, movies, and series.",
	path: "/dashboard/addplaylist/xtream",
	noIndex: true,
});

function Page() {
	return <XtreamCodesForm />;
}

export default Page;
