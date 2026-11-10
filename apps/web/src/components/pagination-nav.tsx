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
	className,
}: {
	href: Route;
	enabled: boolean;
	label: string;
	children: React.ReactNode;
	iconOnly?: boolean;
	className?: string;
}) {
	const size = iconOnly ? "icon-sm" : "sm";
	if (!enabled) {
		return (
			<Button
				variant="outline"
				size={size}
				disabled
				aria-label={iconOnly ? label : undefined}
				className={className}
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
			className={className}
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
			className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2"
		>
			<PageLink
				href={pageHref(1)}
				enabled={hasPreviousPage}
				label="First page"
				iconOnly
				className="hidden sm:inline-flex"
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
				className="whitespace-nowrap px-2 py-1 text-sm text-muted-foreground tabular-nums sm:px-3"
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
				className="hidden sm:inline-flex"
			>
				<ChevronsRight className="size-4" />
			</PageLink>
		</nav>
	);
}
