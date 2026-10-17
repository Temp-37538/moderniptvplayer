import { ChannelDetailSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<ChannelDetailSkeleton />}>{children}</Suspense>;
}

export default Layout;
