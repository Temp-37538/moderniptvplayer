"use client";

import { getPlaylistStatusAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type PlaylistStatus = {
	status: string;
	expDate: number | null;
};

type PlaylistErrorViewProps = {
	error: Error & { digest?: string };
	retry: () => void;
};

function getPlaylistId(pathname: string): string | null {
	const segments = pathname.split("/").filter(Boolean);
	const searchIndex = segments.indexOf("search");
	return searchIndex >= 0
		? (segments[searchIndex + 1] ?? null)
		: (segments[2] ?? null);
}

function formatExpiryDate(expDate: number | null): string | null {
	if (!expDate) {
		return null;
	}
	return new Date(expDate * 1000).toLocaleDateString();
}

function SubscriptionStatusValue({
	status,
}: {
	status: PlaylistStatus | null | undefined;
}) {
	if (status === undefined) {
		return (
			<span className="inline-block h-3.5 w-16 align-middle animate-pulse rounded-md bg-muted" />
		);
	}

	if (status?.status.toLowerCase() === "expired") {
		const expiryDate = formatExpiryDate(status.expDate);
		return (
			<span className="font-semibold text-red-600 dark:text-red-400">
				{status.status}
				{expiryDate ? ` (expired on ${expiryDate})` : ""}.
			</span>
		);
	}

	return <span>{status?.status || "Unknown"}.</span>;
}

export function PlaylistErrorView({ error, retry }: PlaylistErrorViewProps) {
	const pathname = usePathname();
	const playlistId = getPlaylistId(pathname);
	const [status, setStatus] = useState<PlaylistStatus | null | undefined>(
		undefined,
	);
	const [refetchKey, setRefetchKey] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey bumps to force a manual status refetch
	useEffect(() => {
		if (!playlistId) {
			setStatus(null);
			return;
		}

		let cancelled = false;
		setStatus(undefined);

		getPlaylistStatusAction(playlistId)
			.then((value) => {
				if (!cancelled) {
					setStatus(value);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setStatus(null);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [playlistId, refetchKey]);

	return (
		<div className="flex flex-col items-start gap-4 p-4">
			<h1 className="text-base font-medium">Something went wrong</h1>

			<div className="flex flex-col gap-1">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Unable to load the playlist.
				</p>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Please try again later.
				</p>
				<p className="text-sm text-muted-foreground leading-relaxed">
					If the issue persists, your ISP may be blocking access to this
					playlist.
				</p>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Subscription status: <SubscriptionStatusValue status={status} />
				</p>
				{error.digest && (
					<span className="block text-xs text-muted-foreground/60 font-mono mt-1">
						Ref: {error.digest}
					</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Button variant="outline" onClick={() => retry()}>
					Try again
				</Button>
				<Button variant="ghost" onClick={() => setRefetchKey((key) => key + 1)}>
					Check status
				</Button>
			</div>
		</div>
	);
}
