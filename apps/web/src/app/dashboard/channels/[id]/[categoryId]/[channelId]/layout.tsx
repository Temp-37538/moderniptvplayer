import { Suspense } from "react";
import { ChannelDetailSkeleton } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<ChannelDetailSkeleton />}>{children}</Suspense>;
}

export default Layout;
