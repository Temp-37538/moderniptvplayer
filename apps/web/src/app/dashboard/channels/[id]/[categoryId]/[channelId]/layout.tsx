import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
	return (
		<div className="min-h-full p-6 md:p-8"> 
			<div className="max-w-2xl">
				<div className="rounded-xl border border-border/30">
					<div className="flex items-center gap-6 p-6">
						<Skeleton className="size-24 rounded-xl shrink-0" />
						<div className="space-y-3 flex-1">
							<Skeleton className="h-8 w-48" />
							<div className="flex gap-2">
								<Skeleton className="h-7 w-24 rounded-md" />
								<Skeleton className="h-7 w-32 rounded-md" />
							</div>
						</div>
					</div>
					<div className="flex gap-3 p-6 border-t border-border/20">
						<Skeleton className="h-9 w-32 rounded-md" />
						<Skeleton className="h-9 w-32 rounded-md" />
					</div>
				</div>
			</div>
		</div>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

export default Layout;
