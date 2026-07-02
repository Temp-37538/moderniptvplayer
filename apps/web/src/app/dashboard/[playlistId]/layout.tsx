import { Suspense } from "react";
import { PlaylistHomeSkeleton } from "@/components/skeletons";

export default function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<PlaylistHomeSkeleton />}>{children}</Suspense>;
}
