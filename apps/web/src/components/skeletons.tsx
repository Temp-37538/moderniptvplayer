/** biome-ignore-all lint/suspicious/noArrayIndexKey: Skeletons are static so index can be used as key */
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User2 } from "lucide-react";

export function MediaGridSkeletonNoSearchBar({
	count = 12,
}: {
	count?: number;
}) {
	return (
		<div className="h-full overflow-y-auto scrollbar-none">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="space-y-2">
						<Skeleton className="h-6 w-24" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{Array.from({ length: count }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="aspect-2/3 rounded-xl" />
					</div>
				))}
			</div>
		</div>
	);
}

export function ChannelCategorySearchSkeleton() {
	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<div className="space-y-2">
						<Skeleton className="h-7 w-32" />
						<Skeleton className="h-4 w-48" />
					</div>
				</div>
				<div className="relative w-full max-w-3xl">
					<Skeleton className="h-12 w-full rounded-md" />
				</div>
				<Skeleton className="h-4 w-48" />
			</div>

			<div className="flex-1 overflow-y-auto scrollbar-none pb-10">
				<div className="flex justify-center items-center gap-3">
					<div className="flex flex-col  items-center justify-center py-20 animate-pulse">
						<div className="mb-4 size-12 rounded-md bg-muted  " />
						<div className="h-5 w-40 rounded-md bg-muted mb-2  " />
						<div className="h-4 w-56 rounded-md bg-muted  " />
					</div>
				</div>
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
		<div className="h-full overflow-y-auto scrollbar-none">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="space-y-2">
						<Skeleton className="h-6 w-24" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
				{Array.from({ length: count }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 rounded-xl border border-border/50 p-4"
					>
						<Skeleton className="size-12 rounded-lg shrink-0" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/4" />
						</div>
					</div>
				))}
			</div>
			<div className="flex items-center justify-center gap-2 mt-8 pb-4">
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-5 w-16" />
				<Skeleton className="h-8 w-20" />
			</div>
		</div>
	);
}

export function CategoryGridSkeleton({ count = 35 }: { count?: number }) {
	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="space-y-2">
						<Skeleton className="h-7 w-22 md:w-32" />
						<Skeleton className="h-4 w-22 md:w-48 " />
					</div>
				</div>
				<Skeleton className="h-8 w-40 md:w-70 rounded-md" />
			</div>
			<div className="flex-1 overflow-y-auto scrollbar-none">
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
					{Array.from({ length: count }).map((_, i) => (
						<div
							key={i}
							className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-5"
						>
							<Skeleton className="size-10 rounded-lg" />
							<Skeleton className="h-4 w-24 rounded" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function MediaDetailSkeleton() {
	return (
		<div className="min-h-full">
			<div className="w-full px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-12">
				<div className="grid gap-10 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-14">
					<div className="md:sticky md:top-8 md:self-start space-y-5">
						<Skeleton className="aspect-2/3 w-full rounded-2xl" />
						<div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
							<Skeleton className="h-4 w-10" />
							<Skeleton className="h-4 w-12" />
							<Skeleton className="h-4 w-10" />
						</div>
						<div className="mt-5 flex items-center justify-center gap-2 border-t border-border/50 pt-5">
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
						</div>
					</div>

					<div className="min-w-0">
						<Skeleton className="h-10 w-3/4 max-w-md" />
						<Skeleton className="mt-2 h-4 w-32" />
						<Skeleton className="mt-4 h-4 w-24" />
						<div className="mt-6 space-y-2">
							<Skeleton className="h-4 w-full max-w-2xl" />
							<Skeleton className="h-4 w-full max-w-xl" />
							<Skeleton className="h-4 w-full max-w-2xl" />
						</div>
						<section className="mt-10 space-y-3">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<Skeleton className="h-7 w-16" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="aspect-video w-full rounded-2xl" />
						</section>
						<div className="mt-8 grid gap-x-8 gap-y-4 border-y border-border/50 py-6 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-4 w-40" />
							</div>
							<div className="space-y-1.5">
								<Skeleton className="h-3 w-12" />
								<Skeleton className="h-4 w-48" />
							</div>
						</div>
						<div className="mt-10 space-y-3">
							<Skeleton className="h-7 w-20" />
							<Skeleton className="aspect-video w-full rounded-2xl" />
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
		<div className="min-h-full">
			<div className="w-full px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-12">
				<div className="grid gap-10 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-14">
					<div className="md:sticky md:top-8 md:self-start">
						<div className="relative">
							<Skeleton className="aspect-2/3 w-full rounded-2xl border border-border/40" />
							<div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
						</div>

						<dl className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
							<div className="flex items-center gap-1.5">
								<Skeleton className="h-3 w-7" />
							</div>
							<div className="flex items-center gap-1.5">
								<Skeleton className="size-3 rounded-full" />
								<Skeleton className="h-3 w-9" />
							</div>
						</dl>

						<div className="mt-5 flex items-center justify-center gap-2 border-t border-border/50 pt-5">
							<Skeleton className="size-8 rounded-[min(var(--radius-md),10px)]" />
							<Skeleton className="size-8 rounded-[min(var(--radius-md),10px)]" />
						</div>
						<div className="mt-5 flex items-center gap-3 rounded-md border border-border/40 px-3 py-2.5">
							<Skeleton className="size-4 shrink-0" />
							<div className="min-w-0 flex-1 space-y-1">
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-4 w-32" />
							</div>
						</div>
						<Skeleton className="h-px w-full" />
					</div>

					<div className="min-w-0">
						<header>
							<Skeleton className="h-11 w-4/5 md:h-12" />
							<Skeleton className="mt-4 h-3 w-24" />
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
	return (
		<section className="mb-8">
			<Skeleton className="mb-3 h-6 w-40" />
			<div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
				{Array.from({ length: count }).map((_, i) => (
					<div key={i} className="w-36 shrink-0 space-y-2">
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
		<div className="max-w-2xl space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-32" />
			</div>
			<div className="space-y-2">
				{Array.from({ length: count }).map((_, i) => (
					<div
						key={i}
						className="ml-4 flex items-center gap-4 py-3 border-b border-border/40 last:border-b-0"
					>
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-3/4 max-w-xs" />
							<Skeleton className="h-3 w-1/2 max-w-50" />
						</div>
						<Skeleton className="size-8 rounded-md shrink-0" />
					</div>
				))}
			</div>
		</div>
	);
}

export function SettingsSkeleton() {
	return (
		<div className="w-full max-w-3xl mx-auto p-4 md:p-6">
			<Tabs value="account" className="w-full gap-4 md:gap-6">
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
									<span className="text-sm font-medium text-muted-foreground">
										Avatar
									</span>
									<div className="flex items-center gap-4">
										<Skeleton className="size-12 rounded-full" />
										<Skeleton className="h-8 w-28" />
									</div>
								</div>
								<div className="flex flex-col gap-3">
									<span className="text-sm font-medium text-muted-foreground">
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
									<span className="text-sm font-medium text-muted-foreground">
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
	);
}

export function SecuritySettingsSkeleton() {
	return (
		<div className="w-full max-w-3xl mx-auto p-4 md:p-6">
			<Tabs value="security" className="w-full gap-4 md:gap-6">
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
									<span className="text-sm font-medium text-muted-foreground">
										Current password
									</span>
									<Skeleton className="h-9 w-full" />
								</div>
								<div className="flex flex-col gap-3">
									<span className="text-sm font-medium text-muted-foreground">
										New password
									</span>
									<Skeleton className="h-9 w-full" />
								</div>
								<div className="flex flex-col gap-3">
									<span className="text-sm font-medium text-muted-foreground">
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
						<h2 className="text-sm font-semibold mb-3">Linked accounts</h2>
						<Card className="p-0">
							<CardContent className="p-0">
								<div className="flex items-center justify-between gap-3 px-6 py-6">
									<div className="flex items-center gap-3">
										<Skeleton className="size-10 rounded-md shrink-0 bg-muted" />
										<div className="flex flex-col gap-1">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-3 w-32" />
										</div>
									</div>
									<Skeleton className="h-8 w-16 rounded-md shrink-0" />
								</div>
								<Separator />
								<div className="flex items-center justify-between gap-3 px-6 py-6">
									<div className="flex items-center gap-3">
										<Skeleton className="size-10 rounded-md shrink-0 bg-muted" />
										<div className="flex flex-col gap-1">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-3 w-32" />
										</div>
									</div>
									<Skeleton className="h-8 w-16 rounded-md shrink-0" />
								</div>
							</CardContent>
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
				</div>
			</Tabs>
		</div>
	);
}

function SavedItemsSectionSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-baseline justify-between gap-4">
				<Skeleton className="h-7 w-32" />
				<Skeleton className="h-5 w-12" />
			</div>
			<div className="space-y-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={i}
						className="ml-4 flex items-center gap-4 py-3 border-b border-border/40 last:border-b-0"
					>
						<div className="flex-1 space-y-1.5">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/3" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function PlaylistHomeSkeleton() {
	return (
		<div className="flex h-full flex-col overflow-y-auto scrollbar-none p-6">
			<div className="w-full max-w-4xl space-y-10">
				<header className="space-y-1">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-64" />
				</header>

				<div className="grid gap-x-8 sm:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="flex min-h-32 flex-col justify-between py-5"
						>
							<div className="flex items-center justify-between">
								<Skeleton className="size-5" />
								<Skeleton className="size-4" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-7 w-24" />
								<Skeleton className="h-5 w-32" />
							</div>
						</div>
					))}
				</div>

				<div className="grid gap-10 md:grid-cols-2">
					<SavedItemsSectionSkeleton />
					<SavedItemsSectionSkeleton />
				</div>
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
