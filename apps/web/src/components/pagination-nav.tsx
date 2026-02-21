import type { PaginationNavProps } from "@/components/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationNav({
	currentPage,
	hasNextPage,
	hasPreviousPage,
	baseUrl,
}: PaginationNavProps) {
	if (!hasPreviousPage && !hasNextPage) return null;

	return (
		<nav className="flex items-center justify-center gap-2 mt-8">
			{hasPreviousPage ? (
				<Button
					nativeButton={false}
					variant="outline"
					size="sm"
					render={<Link href={`${baseUrl}?page=${currentPage - 1}`} />}
				>
					<ChevronLeft className="size-4" />
					Previous
				</Button>
			) : (
				<Button variant="outline" size="sm" disabled>
					<ChevronLeft className="size-4" />
					Previous
				</Button>
			)}
			<span className="px-3 py-1 text-sm text-muted-foreground tabular-nums">
				Page {currentPage}
			</span>
			{hasNextPage ? (
				<Button
					nativeButton={false}
					variant="outline"
					size="sm"
					render={<Link href={`${baseUrl}?page=${currentPage + 1}`} />}
				>
					Next
					<ChevronRight className="size-4" />
				</Button>
			) : (
				<Button variant="outline" size="sm" disabled>
					Next
					<ChevronRight className="size-4" />
				</Button>
			)}
		</nav>
	);
}
