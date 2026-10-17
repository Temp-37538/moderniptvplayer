import { MediaGridSkeletonNoSearchBar } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<MediaGridSkeletonNoSearchBar count={18} />}>
			{children}
		</Suspense>
	);
}

export default Layout;
