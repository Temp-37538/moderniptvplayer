import { Suspense } from "react";
import { ShowDetailSkeleton } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<ShowDetailSkeleton />}>{children}</Suspense>;
}

export default Layout;
