import { PlaylistHomeSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

export const instant = false;

export default function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<PlaylistHomeSkeleton />}>{children}</Suspense>;
}
