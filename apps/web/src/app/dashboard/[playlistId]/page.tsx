export default async function PlaylistHomePage({
	params,
}: {
	params: Promise<{ playlistId: string }>;
}) {
	const { playlistId } = await params;
 
	return <div  >Home - Playlist: {playlistId}</div>;
}
