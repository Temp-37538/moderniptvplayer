import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
	return (
		<div className="min-h-full p-6 md:p-8"> 
			<div className="flex items-center gap-3 mb-6">
				<Skeleton className="size-10 rounded-xl" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-4 w-16" />
				</div>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
				{Array.from({ length: 20 }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 rounded-xl border border-border/30 p-4"
					>
						<Skeleton className="size-12 rounded-lg shrink-0" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/4" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

export default Layout;
