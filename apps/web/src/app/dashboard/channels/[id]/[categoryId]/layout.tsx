import { Suspense } from "react";
import { ChannelListSkeletonNoSearchBar } from "@/components/skeletons";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<ChannelListSkeletonNoSearchBar />}>
			{children}
		</Suspense>
	);
}

export default Layout;
