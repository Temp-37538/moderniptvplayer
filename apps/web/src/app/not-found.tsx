import { NotFoundView } from "@/components/not-found-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Page not found",
	robots: { index: false },
};

export default function NotFound() {
	return <NotFoundView className="min-h-full bg-background" />;
}
