"use client";

import { PlaylistErrorView } from "@/components/playlist-error-view";

export default function RouteError({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	return <PlaylistErrorView error={error} retry={retry} />;
}
