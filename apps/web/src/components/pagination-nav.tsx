import type { PaginationNavProps } from "@/components/types";
import { Button } from "@/components/ui/button";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

function PageLink({
	href,
	enabled,
	label,
	children,
	iconOnly = false,
}: {
	href: Route;
	enabled: boolean;
	label: string;
	children: React.ReactNode;
	iconOnly?: boolean;
}) {
	const size = iconOnly ? "icon-sm" : "sm";
	if (!enabled) {
		return (
			<Button
				variant="outline"
				size={size}
				disabled
				aria-label={iconOnly ? label : undefined}
			>
				{children}
			</Button>
		);
	}
	return (
		<Button
			nativeButton={false}
			variant="outline"
			size={size}
			aria-label={iconOnly ? label : undefined}
			render={<Link href={href} />}
		>
			{children}
		</Button>
	);
}

export function PaginationNav({
	currentPage,
	totalPages,
	hasNextPage,
	hasPreviousPage,
	baseUrl,
}: PaginationNavProps) {
	if (!hasPreviousPage && !hasNextPage) return null;

	const pageHref = (page: number) => `${baseUrl}?page=${page}` as Route;
	// A page past the end (an old link) still reads against the real total.
	const lastPage = Math.max(totalPages, 1);

	return (
		<nav
			aria-label="Pagination"
			className="flex items-center justify-center gap-2 mt-8"
		>
			<PageLink
				href={pageHref(1)}
				enabled={hasPreviousPage}
				label="First page"
				iconOnly
			>
				<ChevronsLeft className="size-4" />
			</PageLink>
			<PageLink
				href={pageHref(Math.min(currentPage - 1, lastPage))}
				enabled={hasPreviousPage}
				label="Previous page"
			>
				<ChevronLeft className="size-4" />
				Previous
			</PageLink>
			<span
				aria-current="page"
				className="px-3 py-1 text-sm text-muted-foreground tabular-nums"
			>
				Page {currentPage} of {lastPage}
			</span>
			<PageLink
				href={pageHref(currentPage + 1)}
				enabled={hasNextPage}
				label="Next page"
			>
				Next
				<ChevronRight className="size-4" />
			</PageLink>
			<PageLink
				href={pageHref(lastPage)}
				enabled={hasNextPage}
				label="Last page"
				iconOnly
			>
				<ChevronsRight className="size-4" />
			</PageLink>
		</nav>
	);
}
