import { Suspense } from "react";
import { ChannelListSkeleton } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<ChannelListSkeleton count={36} />}>{children}</Suspense>;
}

export default Layout;
