import { ChannelCategorySearchSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<ChannelCategorySearchSkeleton />}>{children}</Suspense>
	);
}

export default Layout;
