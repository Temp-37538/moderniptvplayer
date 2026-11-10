import { createPageMetadata } from "@/app/metadata";
import { GlobalSearch } from "@/components/global-search";
import { getPlaylistById } from "@/server/xtream";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const instant = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	return createPageMetadata({
		title: "Search",
		description: "Search channels, movies, and series across this playlist.",
		path: `/dashboard/search/${id}`,
		noIndex: true,
	});
}

export default function GlobalSearchPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return <GlobalSearchPageContent params={params} />;
}

async function GlobalSearchPageContent({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	return (
		<div className="flex h-full flex-col overflow-y-auto p-6">
			<div className="w-full max-w-5xl">
				<GlobalSearch playlistId={id} playlistName={playlist.playlistName} />
			</div>
		</div>
	);
}
