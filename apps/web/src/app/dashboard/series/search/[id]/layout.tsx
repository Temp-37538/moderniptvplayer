import { CategoryGridSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<CategoryGridSkeleton count={40} />}>
			{children}
		</Suspense>
	);
}

export default Layout;
