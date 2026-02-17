import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";

import { Button } from "@/components/ui/button";
import {
	ChevronLeft,
	ChevronRight,
	Radio,
	PackageOpen,
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

type PageProps = {
	params: Promise<{ id: string; categoryId: string }>;
	searchParams: Promise<{ page?: string }>;
};

export default async function ChannelsByCategoryPage({
	params,
	searchParams,
}: PageProps) {
	const { id, categoryId } = await params;
	const { page: pageParam } = await searchParams;
	const currentPage = Number(pageParam) || 1;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);

	const channels = (await xtream.getChannels({
		categoryId,
		page: currentPage,
		limit: ITEMS_PER_PAGE,
	})) as Array<{
		id: string;
		name: string;
		number: number;
		logo: string;
		epgId: string;
		categoryIds: string[];
		url: string;
	}>;

	const hasNextPage = channels.length === ITEMS_PER_PAGE;
	const hasPreviousPage = currentPage > 1;

	return (
		<div className="h-full overflow-y-auto p-6 md:p-8">


			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Radio className="size-5" />
					</div>
					<div>
						<h1 className="text-xl font-bold tracking-tight">
							Channels
						</h1>
						<p className="text-sm text-muted-foreground">
							Page {currentPage}
						</p>
					</div>
				</div>
			</div>

			{/* Channel List */}
			{channels.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{channels.map((channel) => (
						<Link
							key={channel.id}
							href={`/dashboard/channels/${id}/${categoryId}/${channel.id}`}
							className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5"
						>
							{/* Logo */}
							<div className="flex items-center justify-center size-12 rounded-lg bg-muted overflow-hidden shrink-0">
								{channel.logo ? (
									<img
										src={channel.logo}
										alt={channel.name}
										className="size-full object-contain p-1"
									/>
								) : (
									<Radio className="size-5 text-muted-foreground/40" />
								)}
							</div>

							{/* Info */}
							<div className="flex-1 min-w-0">
								<h3 className="text-sm font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
									{channel.name}
								</h3>
								{channel.number > 0 && (
									<p className="text-xs text-muted-foreground mt-0.5">
										Ch. {channel.number}
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">
						No channels in this category
					</p>
					<p className="text-sm">Try another category.</p>
				</div>
			)}

			{/* Pagination */}
			{(hasPreviousPage || hasNextPage) && (
				<nav className="flex items-center justify-center gap-2 mt-8">
					{hasPreviousPage ? (
						<Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/dashboard/channels/${id}/${categoryId}?page=${currentPage - 1}`} />}>
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
						<Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/dashboard/channels/${id}/${categoryId}?page=${currentPage + 1}`} />}>
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
			)}
		</div>
	);
}
