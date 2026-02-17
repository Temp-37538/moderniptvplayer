import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
	return (
		<div className="min-h-full p-6 md:p-4"> 
			<div className="flex flex-col md:flex-row gap-8 mb-8">
				<Skeleton className="w-48 md:w-56 aspect-2/3 rounded-xl shrink-0" />
				<div className="flex-1 space-y-4">
					<Skeleton className="h-9 w-72" />
					<div className="flex gap-2">
						<Skeleton className="h-7 w-16 rounded-md" />
						<Skeleton className="h-7 w-20 rounded-md" />
						<Skeleton className="h-7 w-24 rounded-md" />
					</div>
					<div className="flex gap-1.5">
						<Skeleton className="h-6 w-16 rounded-full" />
						<Skeleton className="h-6 w-20 rounded-full" />
					</div>
					<Skeleton className="h-20 w-full max-w-2xl" />
					<Skeleton className="h-4 w-48" />
				</div>
			</div>
			{/* Season skeletons */}
			<Skeleton className="h-6 w-24 mb-4" />
			{Array.from({ length: 2 }).map((_, i) => (
				<div key={i} className="mb-4">
					<Skeleton className="h-16 rounded-t-xl" />
					{Array.from({ length: 4 }).map((_, j) => (
						<Skeleton
							key={j}
							className="h-14 rounded-none border-t border-border/20"
						/>
					))}
				</div>
			))}
		</div>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

export default Layout;
