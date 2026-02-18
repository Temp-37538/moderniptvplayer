import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
	return (
		<div className="max-w-2xl">
			<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
				<div className="flex items-center gap-6 p-6 bg-muted/20">
					<Skeleton className="size-24 rounded-xl shrink-0" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-48" />
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-7 w-24 rounded-md" /> 
						</div>
					</div>
				</div>
				<div className="flex flex-wrap gap-3 p-6 border-t border-border/30">
					<Skeleton className="h-9 w-32 rounded-md" />
					<Skeleton className="h-9 w-32 rounded-md" />
				</div>
			</div>
		</div>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

export default Layout;
