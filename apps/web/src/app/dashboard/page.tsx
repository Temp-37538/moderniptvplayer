import { createPageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata({
	title: "Dashboard",
	description:
		"Open your private dashboard to manage playlists and browse your library.",
	path: "/dashboard",
	noIndex: true,
});

function Page() {
	return <div>Home</div>;
}

export default Page;
