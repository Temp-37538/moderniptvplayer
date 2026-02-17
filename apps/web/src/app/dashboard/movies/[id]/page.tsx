import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById, createXtreamClient } from "@/server/xtream";
import { Film, FolderOpen } from "lucide-react";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function MovieCategoriesPage({ params }: PageProps) {
	const { id } = await params;

	const playlist = await getPlaylistById(id);

	if (!playlist) {
		notFound();
	}

	const xtream = createXtreamClient(playlist);
	const categories = await xtream.getMovieCategories();

	const typedCategories = categories as Array<{
		id: string;
		name: string;
		parentId: string;
	}>;

	return (
		<div className="h-full overflow-y-auto p-6 md:p-4"> 
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Film className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							Movies
						</h1>
						<p className="text-sm text-muted-foreground">
							{playlist.playlistName} · {typedCategories.length}{" "}
							categories
						</p>
					</div>
				</div>
			</div>

			{/* Category Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
				{typedCategories.map((category, i) => (
					<Link
						key={category.id}
						href={`/dashboard/movies/${id}/${category.id}`}
						className="group relative flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
						style={{
							animationDelay: `${Math.min(i * 30, 500)}ms`,
						}}
					>
						<div className="flex items-center justify-center size-10 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200">
							<FolderOpen className="size-5" />
						</div>
						<span className="text-sm font-medium text-center leading-tight line-clamp-2">
							{category.name}
						</span>
					</Link>
				))}
			</div>

			{typedCategories.length === 0 && (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<FolderOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">No categories found</p>
					<p className="text-sm">
						This playlist has no movie categories.
					</p>
				</div>
			)}
		</div>
	);
}
