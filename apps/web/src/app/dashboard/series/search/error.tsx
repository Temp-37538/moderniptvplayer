"use client";
import { Button } from "@/components/ui/button";

export default function Error({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
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
				{error.digest && (
					<span className="block text-xs text-muted-foreground/60 font-mono mt-1">
						Ref: {error.digest}
					</span>
				)}
			</div>

			<Button variant="outline" onClick={() => unstable_retry()}>
				Try again
			</Button>
		</div>
	);
}
