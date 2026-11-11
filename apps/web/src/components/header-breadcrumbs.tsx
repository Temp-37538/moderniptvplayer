"use client";

import type { Crumb } from "@/lib/breadcrumbs";
import { cn } from "@/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import React from "react";
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "./ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** One crumb label: truncated, with the full text as a tooltip, RTL aware. */
const LABEL_CLASS = "block max-w-48 truncate";

function CrumbLabel({ crumb, current }: { crumb: Crumb; current: boolean }) {
	if (current) {
		return (
			<BreadcrumbPage dir="auto" title={crumb.label} className={LABEL_CLASS}>
				{crumb.label}
			</BreadcrumbPage>
		);
	}
	if (crumb.link) {
		return (
			<BreadcrumbLink
				dir="auto"
				title={crumb.label}
				className={LABEL_CLASS}
				render={<Link href={crumb.href as Route} />}
			>
				{crumb.label}
			</BreadcrumbLink>
		);
	}
	return (
		<span dir="auto" title={crumb.label} className={LABEL_CLASS}>
			{crumb.label}
		</span>
	);
}

/**
 * Header breadcrumbs on one line. From md: the first crumb, the parent and
 * the current page, with the crumbs in between behind a "..." menu. From lg
 * the whole chain shows and each crumb shrinks before anything wraps.
 */
export function HeaderBreadcrumbs({
	crumbs,
	pathname,
}: {
	crumbs: Crumb[];
	pathname: string;
}) {
	const lastIndex = crumbs.length - 1;
	const middle = crumbs.slice(1, Math.max(1, lastIndex - 1));

	return (
		<Breadcrumb className="min-w-0">
			<BreadcrumbList className="flex-nowrap">
				{crumbs.map((crumb, index) => {
					const isLast = index === lastIndex;
					const isMiddle = index > 0 && index < lastIndex - 1;
					const isCurrent = isLast && crumb.href === pathname;

					return (
						<React.Fragment key={crumb.href}>
							<BreadcrumbItem
								className={cn(
									"hidden min-w-0",
									isMiddle ? "lg:inline-flex" : "md:inline-flex",
									// The current page gives way last.
									isLast && "shrink-0 max-w-[50%]",
								)}
							>
								<CrumbLabel crumb={crumb} current={isCurrent} />
							</BreadcrumbItem>
							{index === 0 && middle.length > 0 ? (
								<>
									<BreadcrumbSeparator className="hidden md:block lg:hidden" />
									<BreadcrumbItem className="hidden shrink-0 md:inline-flex lg:hidden">
										<DropdownMenu>
											<DropdownMenuTrigger
												aria-label="Show the hidden breadcrumbs"
												className="flex cursor-pointer items-center rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
											>
												<BreadcrumbEllipsis />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="start" className="max-w-72">
												{middle.map((item) =>
													item.link ? (
														<DropdownMenuItem
															key={item.href}
															render={<Link href={item.href as Route} />}
														>
															<span dir="auto" className="truncate">
																{item.label}
															</span>
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem key={item.href} disabled>
															<span dir="auto" className="truncate">
																{item.label}
															</span>
														</DropdownMenuItem>
													),
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</BreadcrumbItem>
								</>
							) : null}
							{!isLast && (
								<BreadcrumbSeparator
									className={cn("hidden", isMiddle ? "lg:block" : "md:block")}
								/>
							)}
						</React.Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
