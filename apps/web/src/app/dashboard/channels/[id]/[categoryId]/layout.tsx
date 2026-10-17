import { ChannelListSkeletonNoSearchBar } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<ChannelListSkeletonNoSearchBar count={18} />}>
			{children}
		</Suspense>
	);
}

export default Layout;
