import { Suspense } from "react";
import { MediaDetailSkeleton } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<MediaDetailSkeleton />}>{children}</Suspense>;
}

export default Layout;
