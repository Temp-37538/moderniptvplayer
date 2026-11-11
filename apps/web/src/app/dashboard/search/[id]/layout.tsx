import { GlobalSearchSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

export default function GlobalSearchLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Suspense fallback={<GlobalSearchSkeleton />}>{children}</Suspense>;
}
