import { Suspense } from "react";
import { MediaGridSkeletonNoSearchBar } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<MediaGridSkeletonNoSearchBar />}>{children}</Suspense>
	);
}

export default Layout;
