"use client";

import { PlaylistErrorView } from "@/components/playlist-error-view";

/**
 * Catch-all for dashboard pages without their own boundary (home, playlist
 * overview, library, settings), so a failure keeps the sidebar and offers a
 * retry instead of the framework error screen.
 */
export default function DashboardError({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	return <PlaylistErrorView error={error} retry={retry} generic />;
}
