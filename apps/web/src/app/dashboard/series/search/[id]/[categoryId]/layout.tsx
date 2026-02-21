import { ChannelCategorySearchSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<ChannelCategorySearchSkeleton count={20} />}>
			{children}
		</Suspense>
	);
}

export default Layout;
