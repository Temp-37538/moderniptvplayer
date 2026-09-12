import { ChannelCategorySearchSkeleton } from "@/components/skeletons";
import { Suspense } from "react";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<ChannelCategorySearchSkeleton />}>{children}</Suspense>
	);
}

export default Layout;
