/** biome-ignore-all lint/suspicious/noArrayIndexKey: Skeletons are static so index can be used as key */
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Shield, User2 } from "lucide-react";

/** Same box as PageContainer: the layout pads, the page scrolls. */
function SkeletonPage({
	children,
	narrow = false,
	className,
}: {
	children: React.ReactNode;
	narrow?: boolean;
	className?: string;
}) {
	return (
		<div className="h-full overflow-hidden">
			<div
				className={cn(
					"w-full space-y-6 pb-6",
					narrow && "max-w-4xl",
					className,
				)}
			>
				{children}
			</div>
		</div>
	);
}

/**
 * PageHeader: the serif title line (2.25rem, 3rem from md, at 1.05 line
 * height) and a 20 px description line, so content below does not move.
 */
function PageHeaderSkeleton({
	titleWidth = "w-56",
	descriptionWidth = "w-40",
	wrapsOnPhones = false,
}: {
	titleWidth?: string;
	descriptionWidth?: string | null;
	/** The description runs to two lines below `sm`. */
	wrapsOnPhones?: boolean;
}) {
	return (
		<header className="space-y-2">
			<div className="flex h-[2.3625rem] items-center md:h-[3.15rem]">
				<Skeleton className={cn("h-8 md:h-10", titleWidth)} />
			</div>
			{descriptionWidth ? (
				<div
					className={cn(
						"flex flex-col justify-around",
						wrapsOnPhones ? "h-10 sm:h-5" : "h-5",
					)}
				>
					<Skeleton className={cn("h-3.5", descriptionWidth)} />
					{wrapsOnPhones ? <Skeleton className="h-3.5 w-16 sm:hidden" /> : null}
				</div>
			) : null}
		</header>
	);
}

/** One line of text at a given line height, for rows that mirror real text. */
function TextLine({ line, className }: { line: string; className: string }) {
	return (
		<div className={cn("flex items-center", line)}>
			<Skeleton className={className} />
		</div>
	);
}

const NAME_WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-36", "w-16"];

export function MediaGridSkeletonNoSearchBar({
	count = 12,
}: {
	count?: number;
}) {
	return (
		<SkeletonPage>
			<PageHeaderSkeleton titleWidth="w-64" descriptionWidth="w-36" />
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{Array.from({ length: count }).map((_, i) => (
					<div key={i}>
						<Skeleton className="aspect-2/3 rounded-xl" />
						<TextLine
							line="mt-2 h-[1.09375rem]"
							className={cn("h-3", NAME_WIDTHS[i % NAME_WIDTHS.length])}
						/>
					</div>
				))}
			</div>
		</SkeletonPage>
	);
}

/** Per-category search: title, a short line, the field, then the hint. */
export function ChannelCategorySearchSkeleton() {
	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<PageHeaderSkeleton titleWidth="w-56" descriptionWidth="w-48" />
				<Skeleton className="h-12 w-full max-w-3xl rounded-md" />
				<div className="min-h-5" />
			</div>
		</div>
	);
}

export function ChannelListSkeletonNoSearchBar({
	count = 20,
}: {
	count?: number;
}) {
	return (
		<SkeletonPage>
			<PageHeaderSkeleton titleWidth="w-40" descriptionWidth="w-20" />
			<div className="grid grid-cols-2 gap-x-4 gap-y-6 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
				{Array.from({ length: count }).map((_, i) => (
					<div key={i}>
						<Skeleton className="aspect-video w-full rounded-md" />
						<TextLine
							line="mt-2 h-5"
							className={cn("h-3.5", NAME_WIDTHS[i % NAME_WIDTHS.length])}
						/>
					</div>
				))}
			</div>
		</SkeletonPage>
	);
}

/** The typographic category index: title, lock and search, name columns. */
export function CategoryGridSkeleton({ count = 35 }: { count?: number }) {
	return (
		<div className="h-full flex flex-col gap-3 md:gap-4">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<div className="space-y-2">
					<div className="flex h-[2.6125rem] items-center pb-1 md:h-[3.4rem]">
						<Skeleton className="h-8 w-40 md:h-10" />
					</div>
					<TextLine line="h-4 md:h-5" className="h-3 w-44 md:h-3.5" />
				</div>
				<div className="flex flex-col gap-3 xl:flex-row-reverse xl:items-center xl:gap-5">
					<Skeleton className="h-8 w-full rounded-md md:max-w-md xl:w-70" />
					<div className="flex items-center justify-between gap-3 md:max-w-md xl:max-w-none">
						<TextLine line="h-6 md:h-5" className="h-4 w-40 md:w-44" />
						<Skeleton className="h-4 w-8 md:hidden" />
					</div>
				</div>
			</div>
			<div className="-m-1 flex-1 overflow-hidden">
				<div className="columns-1 gap-x-10 p-1 min-[520px]:columns-2 lg:columns-3 2xl:columns-4">
					{Array.from({ length: count }).map((_, i) => (
						<div
							key={i}
							className="flex break-inside-avoid items-center justify-between gap-3 border-b border-border/40 py-2.5"
						>
							<TextLine
								line="h-[1.40625rem]"
								className={cn("h-3.5", NAME_WIDTHS[i % NAME_WIDTHS.length])}
							/>
							<Skeleton className="h-3 w-5" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function MediaDetailSkeleton() {
	return (
		<div className="h-full overflow-hidden">
			<div className="w-full pb-6">
				<div className="grid gap-10 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-14">
					<div className="w-full space-y-5 md:mx-auto md:max-w-xs xl:mx-0 xl:max-w-none xl:self-start">
						<Skeleton className="aspect-2/3 w-full rounded-2xl" />
						<div className="mt-5 flex h-4 flex-wrap items-center justify-center gap-x-6 gap-y-2">
							<Skeleton className="h-3 w-14" />
							<Skeleton className="h-3 w-10" />
						</div>
						<div className="mt-5 flex items-center justify-center gap-2 border-t border-border/50 pt-5">
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
						</div>
					</div>

					<div className="min-w-0 max-w-4xl">
						<div className="flex h-[2.3625rem] items-center md:h-[3.15rem]">
							<Skeleton className="h-8 w-3/4 max-w-md md:h-10" />
						</div>
						<TextLine line="mt-4 h-4" className="h-3 w-36" />
						<div className="mt-6 max-w-prose">
							<TextLine line="h-[1.584rem]" className="h-3.5 w-full" />
							<TextLine line="h-[1.584rem]" className="h-3.5 w-full" />
							<TextLine line="h-[1.584rem]" className="h-3.5 w-2/3" />
						</div>
						<section className="mt-10 space-y-3">
							<TextLine line="h-8" className="h-6 w-20" />
							<Skeleton className="aspect-video w-full rounded-2xl" />
						</section>
						<div className="mt-8 grid gap-x-8 gap-y-4 border-y border-border/50 py-6 sm:grid-cols-2">
							{["w-40", "w-56", "w-32"].map((width, i) => (
								<div key={i}>
									<TextLine line="h-6" className="h-4 w-16" />
									<TextLine line="mt-1.5 h-5" className={cn("h-3.5", width)} />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function ChannelDetailSkeleton() {
	return (
		<div className="w-full max-w-2xl space-y-5">
			<div className="flex items-center gap-4">
				<Skeleton className="size-14 shrink-0 rounded-lg" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
			<Skeleton className="aspect-video w-full rounded-lg" />
			<div className="flex flex-wrap items-center justify-end gap-2">
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
			</div>
		</div>
	);
}

export function ShowDetailSkeleton() {
	return (
		<div className="h-full overflow-hidden">
			<div className="w-full pb-6">
				<div className="grid gap-10 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-14">
					<div className="w-full space-y-5 md:mx-auto md:max-w-xs xl:mx-0 xl:max-w-none xl:self-start">
						<div className="relative">
							<Skeleton className="aspect-2/3 w-full rounded-2xl border border-border/40" />
							<div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
						</div>

						<dl className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
							<TextLine line="h-4" className="h-3 w-8" />
							<TextLine line="h-4" className="h-3 w-16" />
						</dl>

						<div className="mt-5 flex items-center justify-center gap-2 border-t border-border/50 pt-5">
							<Skeleton className="size-8 rounded-[min(var(--radius-md),10px)]" />
							<Skeleton className="size-8 rounded-[min(var(--radius-md),10px)]" />
						</div>
						<div className="mt-5 overflow-hidden rounded-md border border-border/40">
							<div className="flex items-center gap-3 px-3 py-2.5">
								<Skeleton className="size-4 shrink-0" />
								<div className="min-w-0 flex-1">
									<TextLine line="h-4" className="h-3 w-24" />
									<TextLine line="h-5" className="h-3.5 w-32" />
								</div>
							</div>
						</div>
					</div>

					<div className="min-w-0 max-w-4xl">
						<header>
							<div className="flex h-[2.3625rem] items-center md:h-[3.15rem]">
								<Skeleton className="h-8 w-3/5 md:h-10" />
							</div>
							<TextLine line="mt-4 h-4" className="h-3 w-28" />
						</header>

						<div className="mt-6 max-w-prose space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-11/12" />
							<Skeleton className="h-4 w-2/3" />
						</div>

						<dl className="mt-8 grid gap-x-8 gap-y-4 border-y border-border/50 py-6 sm:grid-cols-2">
							<div className="space-y-2">
								<Skeleton className="h-2.5 w-16" />
								<Skeleton className="h-4 w-44" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-2.5 w-12" />
								<Skeleton className="h-4 w-full" />
							</div>
						</dl>

						<div className="mt-12 space-y-12">
							{Array.from({ length: 2 }).map((_, index) => (
								<section key={index}>
									<div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/50 pb-3">
										<Skeleton className="h-7 w-28" />
										<Skeleton className="h-3 w-32" />
									</div>

									<div className="grid grid-cols-1 border-t border-border/40 sm:grid-cols-2">
										{Array.from({ length: 4 }).map((__, cell) => (
											<div
												key={cell}
												className="flex items-start gap-3.5 border-b border-border/40 p-4 sm:border-r sm:even:border-r-0"
											>
												<Skeleton className="mt-0.5 h-3 w-5 shrink-0" />
												<div className="min-w-0 flex-1 space-y-2">
													<Skeleton className="h-3.5 w-3/4" />
													<Skeleton className="h-3 w-1/4" />
												</div>
											</div>
										))}
									</div>
								</section>
							))}
						</div>

						<section className="mt-14">
							<Skeleton className="h-7 w-24" />
							<Skeleton className="mt-4 aspect-video w-full max-w-2xl rounded-xl border border-border/40" />
						</section>
					</div>
				</div>
			</div>
		</div>
	);
}

export function ContinueWatchingSkeleton({ count = 6 }: { count?: number }) {
	const visibility = [
		"",
		"",
		"hidden sm:block",
		"hidden sm:block",
		"hidden lg:block",
		"hidden lg:block",
	];
	return (
		<section className="mb-8">
			<Skeleton className="mb-3 h-6 w-40" />
			<div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
				{Array.from({ length: count }).map((_, i) => (
					<div
						key={i}
						className={`w-36 shrink-0 space-y-2 ${visibility[i] ?? ""}`}
					>
						<Skeleton className="aspect-2/3 w-full rounded-lg" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				))}
			</div>
		</section>
	);
}

export function SavedItemsListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<SkeletonPage narrow>
			<PageHeaderSkeleton titleWidth="w-56" descriptionWidth="w-40" />
			<SavedRowsSkeleton count={count} />
		</SkeletonPage>
	);
}

/** Rows of SavedItemsList: thumbnail, name and meta line, remove button. */
function SavedRowsSkeleton({ count }: { count: number }) {
	return (
		<div className="divide-y divide-border/50 border-y border-border/50">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 py-3">
					<Skeleton className="h-15 w-10 shrink-0 rounded-sm" />
					<div className="min-w-0 flex-1">
						<TextLine
							line="h-[1.40625rem]"
							className={cn("h-3.5", NAME_WIDTHS[i % NAME_WIDTHS.length])}
						/>
						<TextLine line="mt-0.5 h-4" className="h-3 w-40" />
					</div>
					<Skeleton className="size-8 rounded-md shrink-0" />
				</div>
			))}
		</div>
	);
}

export function SettingsSkeleton() {
	return (
		<div className="h-full overflow-hidden">
			<div className="w-full max-w-3xl mx-auto pb-6">
				<Tabs value="account" className="w-full gap-4 max-md:flex-col md:gap-6">
					<div>
						<TabsList aria-label="Settings">
							<TabsTrigger value="account" className="gap-1">
								<User2 className="text-muted-foreground" />
								Account
							</TabsTrigger>
							<TabsTrigger value="security" className="gap-1">
								<Shield className="text-muted-foreground" />
								Security
							</TabsTrigger>
						</TabsList>
					</div>
					<div className="flex-1 flex flex-col gap-6">
						<div>
							<h2 className="text-sm font-semibold mb-3">User profile</h2>
							<Card>
								<CardContent className="flex flex-col gap-6">
									<div className="flex flex-col gap-3">
										<span className="text-sm leading-none font-medium text-muted-foreground">
											Avatar
										</span>
										<div className="flex items-center gap-4">
											<Skeleton className="size-12.5 rounded-full" />
											<Skeleton className="h-8 w-28" />
										</div>
									</div>
									<div className="flex flex-col gap-3">
										<span className="text-sm leading-none font-medium text-muted-foreground">
											Name
										</span>
										<Skeleton className="h-9 w-full" />
									</div>
								</CardContent>
								<CardFooter>
									<Skeleton className="h-8 w-28" />
								</CardFooter>
							</Card>
						</div>
						<div>
							<h2 className="text-sm font-semibold mb-3">Change email</h2>
							<Card>
								<CardContent className="flex flex-col gap-6">
									<div className="flex flex-col gap-3">
										<span className="text-sm leading-none font-medium text-muted-foreground">
											Email
										</span>
										<Skeleton className="h-9 w-full" />
									</div>
								</CardContent>
								<CardFooter>
									<Skeleton className="h-8 w-28" />
								</CardFooter>
							</Card>
						</div>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

export function SecuritySettingsSkeleton() {
	return (
		<div className="h-full overflow-hidden">
			<div className="w-full max-w-3xl mx-auto pb-6">
				<Tabs
					value="security"
					className="w-full gap-4 max-md:flex-col md:gap-6"
				>
					<div>
						<TabsList aria-label="Settings">
							<TabsTrigger value="account" className="gap-1">
								<User2 className="text-muted-foreground" />
								Account
							</TabsTrigger>
							<TabsTrigger value="security" className="gap-1">
								<Shield className="text-muted-foreground" />
								Security
							</TabsTrigger>
						</TabsList>
					</div>
					<div className="flex-1 flex flex-col gap-6">
						<div>
							<h2 className="text-sm font-semibold mb-3">Change password</h2>
							<Card>
								<CardContent className="flex flex-col gap-6">
									<div className="flex flex-col gap-3">
										<span className="text-sm leading-none font-medium text-muted-foreground">
											Current password
										</span>
										<Skeleton className="h-9 w-full" />
									</div>
									<div className="flex flex-col gap-3">
										<span className="text-sm leading-none font-medium text-muted-foreground">
											New password
										</span>
										<Skeleton className="h-9 w-full" />
									</div>
									<div className="flex flex-col gap-3">
										<span className="text-sm leading-none font-medium text-muted-foreground">
											Confirm password
										</span>
										<Skeleton className="h-9 w-full" />
									</div>
								</CardContent>
								<CardFooter>
									<Skeleton className="h-8 w-28" />
								</CardFooter>
							</Card>
						</div>

						<div>
							<h2 className="text-sm font-semibold mb-3">Active sessions</h2>
							<Card className="p-0">
								<CardContent className="p-0">
									<div className="flex items-center justify-between gap-3 px-6 py-6">
										<div className="flex items-center gap-3">
											<Skeleton className="size-10 rounded-md shrink-0 bg-muted" />
											<div className="flex flex-col gap-1">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-3 w-20" />
											</div>
										</div>
										<Skeleton className="h-8 w-24 rounded-md shrink-0" />
									</div>
								</CardContent>
							</Card>
						</div>

						<div>
							<h2 className="mb-3 text-sm font-semibold text-destructive">
								Danger zone
							</h2>
							<Card className="border-destructive">
								<CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
									<div className="space-y-1.5">
										<Skeleton className="h-3.5 w-28" />
										<Skeleton className="h-3 w-56 max-w-full" />
									</div>
									<Skeleton className="h-8 w-full rounded-md sm:w-32" />
								</CardContent>
							</Card>
						</div>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

function SavedItemsSectionSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-baseline justify-between gap-4">
				<TextLine line="h-7" className="h-5 w-32" />
				<TextLine line="h-5" className="h-3.5 w-12" />
			</div>
			<SavedRowsSkeleton count={3} />
		</div>
	);
}

export function PlaylistHomeSkeleton() {
	return (
		<SkeletonPage narrow className="space-y-10">
			<PageHeaderSkeleton titleWidth="w-64" descriptionWidth="w-56" />

			<div className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="flex min-h-32 flex-col justify-between py-5">
						<div className="flex items-center justify-between">
							<Skeleton className="size-5" />
							<Skeleton className="size-4" />
						</div>
						<div>
							<TextLine line="h-7" className="h-5 w-24" />
							<TextLine line="mt-1 h-5" className="h-3.5 w-36" />
						</div>
					</div>
				))}
			</div>

			<div className="grid gap-10 lg:grid-cols-2">
				<SavedItemsSectionSkeleton />
				<SavedItemsSectionSkeleton />
			</div>
		</SkeletonPage>
	);
}

/** The global search page: title, the search field, kind filters. */
export function GlobalSearchSkeleton() {
	return (
		<div className="flex h-full flex-col gap-6">
			<PageHeaderSkeleton
				titleWidth="w-40"
				descriptionWidth="w-72 max-w-full"
				wrapsOnPhones
			/>
			<div className="space-y-4">
				<Skeleton className="h-12 w-full max-w-3xl rounded-lg" />
				<div className="flex flex-wrap gap-2">
					{["w-11", "w-22", "w-18", "w-17"].map((width, i) => (
						<Skeleton
							key={i}
							className={cn("h-[2.125rem] rounded-full", width)}
						/>
					))}
				</div>
				<TextLine line="h-5" className="h-3.5 w-56" />
			</div>
		</div>
	);
}

interface AuthSuspenseProps {
	path: string;
}

export function AuthSuspense({ path }: AuthSuspenseProps) {
	let titleWidth = "w-20";
	let descWidth = "w-64";
	let fields: string[] = ["email", "password"];
	let footerWidth = "w-48";

	if (path === "sign-up") {
		titleWidth = "w-32";
		descWidth = "w-60";
		fields = ["name", "email", "password"];
		footerWidth = "w-52";
	} else if (path === "forgot-password") {
		titleWidth = "w-28";
		descWidth = "w-56";
		fields = ["email"];
		footerWidth = "w-28";
	} else if (path === "reset-password") {
		titleWidth = "w-28";
		descWidth = "w-44";
		fields = ["password", "confirm-password"];
		footerWidth = "w-28";
	} else if (path === "verify-email") {
		titleWidth = "w-24";
		descWidth = "w-48";
		fields = [];
		footerWidth = "w-28";
	}

	return (
		<div
			data-slot="card"
			className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm w-full max-w-sm bg-background/90"
		>
			<div
				data-slot="card-header"
				className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6"
			>
				<Skeleton className={`h-6 md:h-7 ${titleWidth} rounded-md`} />
				<Skeleton className={`h-3.5 md:h-4 ${descWidth} rounded-md`} />
			</div>

			<div data-slot="card-content" className="px-6 grid gap-6">
				<div className="grid gap-4">
					<div className="grid w-full gap-6">
						{fields.length > 0 && (
							<div className="grid gap-4">
								{fields.map((field) => (
									<div key={field} data-slot="form-item" className="grid gap-2">
										<Skeleton className="h-3.5 w-16 rounded-md" />
										<div className="relative">
											<Skeleton className="h-9 w-full rounded-md border border-input/50 bg-muted/20" />
										</div>
									</div>
								))}
							</div>
						)}

						<div className="h-9 w-full rounded-md bg-primary/20 border border-primary/10 flex items-center justify-center animate-pulse">
							<div className="h-4 w-12 rounded bg-primary/40" />
						</div>
					</div>
				</div>
			</div>

			<div
				data-slot="card-footer"
				className="flex items-center px-6 [.border-t]:pt-6 justify-center gap-1.5 text-muted-foreground text-sm"
			>
				<Skeleton className={`h-4 ${footerWidth} rounded-md`} />
			</div>
		</div>
	);
}
