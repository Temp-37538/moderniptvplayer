import { cn } from "@/lib/utils";

/**
 * Scrollable page body. The dashboard layout already pads the content area,
 * so pages add no outer padding of their own. `narrow` caps text-heavy pages
 * (lists, overviews); grids keep the full width.
 */
export function PageContainer({
	children,
	width = "full",
	className,
}: {
	children: React.ReactNode;
	width?: "full" | "narrow";
	className?: string;
}) {
	return (
		<div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-border/50 scrollbar-track-border/20">
			<div
				className={cn(
					"w-full space-y-6 pb-6",
					width === "narrow" && "max-w-4xl",
					className,
				)}
			>
				{children}
			</div>
		</div>
	);
}

/**
 * The one page title style: the serif display face of the home page and the
 * detail pages, at the same size everywhere.
 */
export const PAGE_TITLE_CLASS =
	"font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl";

/** Page title block shared by dashboard pages. */
export function PageHeader({
	title,
	description,
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
}) {
	return (
		<header className="space-y-2">
			<h1 className={PAGE_TITLE_CLASS}>{title}</h1>
			{description ? (
				<p className="text-sm text-muted-foreground">{description}</p>
			) : null}
		</header>
	);
}
