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
		<div className="h-full overflow-y-auto">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<Skeleton className="size-10 rounded-xl" />
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
					<Skeleton className="size-10 rounded-xl" />
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

			<div className="flex-1  overflow-y-auto no-scrollbar pb-10">
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
		<div className="h-full overflow-y-auto">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<Skeleton className="size-10 rounded-xl" />
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
		<div className="h-full flex flex-col gap-4 no-scrollbar">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="size-10 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-7 w-22 md:w-32" />
						<Skeleton className="h-4 w-22 md:w-48 " />
					</div>
				</div>
				<Skeleton className="h-8 w-40 md:w-70 rounded-md" />
			</div>
			<div className="flex-1 overflow-y-auto no-scrollbar">
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
		<div className="min-h-full overflow-y-scroll no-scrollbar">
			<div className="relative">
				<div className="relative">
					<div className="flex flex-col md:flex-row gap-8">
						<div className="shrink-0">
							<Skeleton className="w-48 md:w-56 aspect-2/3 rounded-xl shadow-2xl shadow-black/30 border border-border/30" />
						</div>
						<div className="flex-1 space-y-5">
							<div>
								<Skeleton className="h-9 w-3/4 max-w-md mb-2" />
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Skeleton className="h-7 w-14 rounded-md" />
								<Skeleton className="h-7 w-24 rounded-md" />
								<Skeleton className="h-7 w-20 rounded-md" />
							</div>
							<div className="flex flex-wrap gap-1.5">
								<Skeleton className="h-6 w-16 rounded-full" />
								<Skeleton className="h-6 w-20 rounded-full" />
								<Skeleton className="h-6 w-14 rounded-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-full max-w-2xl" />
								<Skeleton className="h-4 w-full max-w-2xl" />
								<Skeleton className="h-4 w-full max-w-2xl" />
							</div>
							<div className="space-y-2 pt-2">
								<Skeleton className="h-4 w-64" />
								<Skeleton className="h-4 w-64" />
								<Skeleton className="h-4 w-64" />
							</div>
							<div className="flex flex-wrap gap-3 pt-2">
								<Skeleton className="h-9 w-10 rounded-md" />
								<Skeleton className="h-9 w-10 rounded-md" />
								<Skeleton className="h-9 w-10 rounded-md" />
								<Skeleton className="h-9 w-10 rounded-md" />
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="  pb-8 mt-8">
				<Skeleton className="h-7 w-24 mb-4" />
				<Skeleton className="w-full max-w-3xl aspect-video rounded-xl shadow-xl border border-border/50" />
			</div>
		</div>
	);
}

export function ChannelDetailSkeleton() {
	return (
		<div className="max-w-2xl">
			<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
				<div className="flex items-center gap-6 p-6 bg-muted/20">
					<Skeleton className="size-24 rounded-xl shrink-0" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-48" />
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-7 w-24 rounded-md" />
						</div>
					</div>
				</div>
				<div className="flex flex-wrap gap-3 p-6 border-t border-border/30">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>
		</div>
	);
}

export function ShowDetailSkeleton() {
	return (
		<div className="min-h-full overflow-y-scroll">
			<div className="relative">
				<div className="relative">
					<div className="flex flex-col md:flex-row gap-8 mb-8">
						<div className="shrink-0">
							<Skeleton className="w-48 md:w-56 aspect-2/3 rounded-xl shadow-2xl shadow-black/30 border border-border/30" />
						</div>
						<div className="flex-1 space-y-5">
							<Skeleton className="h-9 w-3/4 max-w-md" />
							<div className="flex flex-wrap items-center gap-2">
								<Skeleton className="h-7 w-16 rounded-md" />
								<Skeleton className="h-7 w-20 rounded-md" />
								<Skeleton className="h-7 w-24 rounded-md" />
							</div>
							<div className="flex flex-wrap gap-1.5">
								<Skeleton className="h-6 w-16 rounded-full" />
								<Skeleton className="h-6 w-20 rounded-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-full max-w-2xl" />
								<Skeleton className="h-4 w-full max-w-xl" />
							</div>
							<div className="space-y-2 pt-2">
								<Skeleton className="h-4 w-64" />
								<Skeleton className="h-4 w-80" />
							</div>
							<div className="flex flex-wrap gap-3 pt-2">
								<Skeleton className="h-9 w-32 rounded-md" />
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="px-6 md:px-8 pb-6">
				<Skeleton className="h-7 w-24 mb-4" />
				<Skeleton className="w-full max-w-3xl aspect-video rounded-xl shadow-xl border border-border/50" />
			</div>

			<div className="px-6 md:px-8 pb-8 space-y-8">
				<Skeleton className="h-7 w-32" />
				{Array.from({ length: 2 }).map((_, i) => (
					<section
						key={i}
						className="rounded-xl border border-border/50 bg-card overflow-hidden"
					>
						<div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
							<div className="space-y-1.5">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
						<div className="divide-y divide-border/30">
							{Array.from({ length: 3 }).map((_, j) => (
								<div key={j} className="flex items-start gap-4 px-5 py-4">
									<Skeleton className="size-8 rounded-lg shrink-0 mt-0.5" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-3 w-full max-w-2xl" />
										<Skeleton className="h-3 w-full max-w-xl" />
									</div>
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
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
						className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-4"
					>
						<div className="flex items-center gap-4 flex-1 min-w-0">
							<Skeleton className="size-8 rounded-lg shrink-0" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4 max-w-xs" />
								<Skeleton className="h-3 w-1/2 max-w-50" />
							</div>
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

export function PlaylistHomeSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={i}
						className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-5"
					>
						<Skeleton className="size-10 rounded-lg" />
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-4 w-full" />
					</div>
				))}
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
