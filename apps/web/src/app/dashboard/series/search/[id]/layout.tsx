import { CategoryGridSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<CategoryGridSkeleton />}>{children}</Suspense>;
}

export default Layout;
