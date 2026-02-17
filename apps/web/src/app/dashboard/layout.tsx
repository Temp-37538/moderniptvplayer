import { AsyncSidebar } from "@/components/asyncsidebar";
import SkeletonSidebar from "@/components/skeletonsidebar";
import { Suspense } from "react";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<Suspense fallback={<SkeletonSidebar>{children}</SkeletonSidebar>}>
			<AsyncSidebar>{children}</AsyncSidebar>
		</Suspense>
	);
}
