import { Suspense } from "react";
import { SavedItemsListSkeleton } from "@/components/skeletons";

function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SavedItemsListSkeleton />}>{children}</Suspense>;
}

export default Layout;
