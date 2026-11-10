import { PAGE_TITLE_CLASS } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export function NotFoundView({ className = "" }: { className?: string }) {
	return (
		<div
			className={`flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center ${className}`}
		>
			<SearchX className="size-12 text-muted-foreground/40" aria-hidden />
			<div className="space-y-2">
				<p className="text-sm font-medium text-primary">404</p>
				<h1 className={PAGE_TITLE_CLASS}>Page not found</h1>
				<p className="max-w-md text-sm text-muted-foreground">
					This page does not exist, or the item is no longer in your playlist.
				</p>
			</div>
			<Button nativeButton={false} render={<Link href="/dashboard" />}>
				<ArrowLeft className="size-4" />
				Back to home
			</Button>
		</div>
	);
}
