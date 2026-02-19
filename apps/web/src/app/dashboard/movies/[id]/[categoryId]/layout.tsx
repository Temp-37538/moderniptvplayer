import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
	return (
		<div className="min-h-full  ">
			<div className="flex items-center gap-3 mb-6">
				<Skeleton className="size-10 rounded-xl" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-4 w-16" />
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{Array.from({ length: 12 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="aspect-2/3 rounded-xl" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/3" />
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
