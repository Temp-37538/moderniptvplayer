import { MediaGridSkeletonNoSearchBar } from "@/components/skeletons";
import { Suspense } from "react";

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<MediaGridSkeletonNoSearchBar />}>{children}</Suspense>
	);
}

export default Layout;
