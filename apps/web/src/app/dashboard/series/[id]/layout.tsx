import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
	return (
		<div className="min-h-full p-6 md:p-4">
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<Skeleton className="size-10 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-7 w-32" />
						<Skeleton className="h-4 w-48" />
					</div>
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
				{Array.from({ length: 35 }).map((_, i) => (
					<Skeleton key={i} className="h-28 rounded-xl" />
				))}
			</div>
		</div>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

export default Layout;
