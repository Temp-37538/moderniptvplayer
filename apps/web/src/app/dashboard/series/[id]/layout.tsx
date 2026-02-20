import { Suspense } from "react";
import { CategoryGridSkeleton } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<CategoryGridSkeleton />}>{children}</Suspense>;
}

export default Layout;
