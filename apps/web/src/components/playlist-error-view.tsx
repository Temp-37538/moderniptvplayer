"use client";

import { getPlaylistStatusAction } from "@/app/dashboard/actions";
import { PAGE_TITLE_CLASS } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { CloudOff, RotateCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type PlaylistStatus = {
	status: string;
	expDate: number | null;
};

type PlaylistErrorViewProps = {
	error: Error & { digest?: string };
	retry: () => void;
	/** For pages that are not tied to one playlist: no subscription check. */
	generic?: boolean;
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

export function PlaylistErrorView({
	error,
	retry,
	generic = false,
}: PlaylistErrorViewProps) {
	const pathname = usePathname();
	const playlistId = generic ? null : getPlaylistId(pathname);
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
		<div role="alert" className="flex max-w-xl flex-col items-start gap-6 pb-6">
			<span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
				<CloudOff aria-hidden className="size-6" />
			</span>

			<header className="space-y-3">
				<h1 className={PAGE_TITLE_CLASS}>Something went wrong</h1>
				<p className="text-sm leading-relaxed text-muted-foreground">
					{generic
						? "This page could not be loaded. Please try again in a moment."
						: "Unable to load the playlist. Please try again in a moment. If the issue persists, your ISP may be blocking access to this playlist."}
				</p>
			</header>

			<div className="space-y-1 text-sm text-muted-foreground">
				{generic ? null : (
					<p>
						Subscription status: <SubscriptionStatusValue status={status} />
					</p>
				)}
				{error.digest && (
					<p className="font-mono text-xs text-muted-foreground/60">
						Ref: {error.digest}
					</p>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Button onClick={() => retry()}>
					<RotateCw aria-hidden />
					Try again
				</Button>
				{generic ? null : (
					<Button
						variant="ghost"
						onClick={() => setRefetchKey((key) => key + 1)}
					>
						Check status
					</Button>
				)}
			</div>
		</div>
	);
}
