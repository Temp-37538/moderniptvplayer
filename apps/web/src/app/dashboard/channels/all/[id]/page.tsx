import "server-only"; 
import Link from "next/link";
import { notFound } from "next/navigation";
import { createXtreamClient, getPlaylistById } from "@/server/xtream";
import type { StandardXtreamChannel } from "@iptv/xtream-api/standardized";
import { PackageOpen, Radio } from "lucide-react";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function AllChannelsPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const channels = (await xtream.getChannels()) as StandardXtreamChannel[];

	return (
		<div className="h-full overflow-y-auto ">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Radio className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">All Channels</h1>
						<p className="text-sm text-muted-foreground">
							{channels.length} channels
						</p>
					</div>
				</div>
			</div>
			{channels.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{channels.map((channel) => {
						const categoryId = channel.categoryIds?.[0] ?? "0";
						return (
							<Link
								key={channel.id}
								href={`/dashboard/channels/${id}/${categoryId}/${channel.id}`}
								className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5"
							>
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
						);
					})}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<PackageOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">No channels in this playlist</p>
					<p className="text-sm">Try another playlist.</p>
				</div>
			)}
		</div>
	);
}
