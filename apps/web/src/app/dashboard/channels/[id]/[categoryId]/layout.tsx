import { Suspense } from "react";
import { ChannelListSkeletonNoSearchBar } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<ChannelListSkeletonNoSearchBar />}>{children}</Suspense>;
}

export default Layout;
