import { Suspense } from "react";
import { PlaylistHomeSkeleton } from "@/components/skeletons";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function Layout({ children }: { children: React.ReactNode }) {
	return <Suspense fallback={<PlaylistHomeSkeleton />}>{children}</Suspense>;
}
