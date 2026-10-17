import { MediaDetailSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<MediaDetailSkeleton />}>{children}</Suspense>;
}

export default Layout;
