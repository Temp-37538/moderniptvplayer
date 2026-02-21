"use client";
import { SearchForm } from "@/components/search-form";
import type {
	CategorySearchBaseProps,
	CategorySearchProps,
} from "@/components/types";
import { Film, FolderOpen, Radio, Tv } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function toLowerCaseSafe(value: unknown) {
	return value === undefined || value === null
		? ""
		: String(value).toLowerCase();
}

function CategorySearchBase({
	id,
	playlistName,
	categories,
	title,
	placeholder,
	emptyTitle,
	emptyDescription,
	hrefPrefix,
	Icon,
}: CategorySearchBaseProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

	useEffect(() => {
		setQuery(searchParams.get("q") ?? "");
	}, [searchParams]);

	const normalized = query.trim().toLowerCase();
	const filteredCategories = normalized
		? categories.filter((category) =>
				toLowerCaseSafe(category.name).includes(normalized),
			)
		: categories;

	return (
		<div className="h-full flex flex-col gap-4 no-scrollbar">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
						<Icon className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
						<p className="text-sm text-muted-foreground">
							{playlistName} · {filteredCategories.length} categories
						</p>
					</div>
				</div>
				<SearchForm
					placeholder={placeholder}
					className="md:w-70 w-full"
					inputName="q"
					inputProps={{
						value: query,
						onChange: (event) => {
							const nextValue = event.target.value;
							setQuery(nextValue);
							const params = new URLSearchParams(searchParams.toString());
							if (nextValue.trim()) {
								params.set("q", nextValue);
							} else {
								params.delete("q");
							}
							const nextUrl = params.toString()
								? `${pathname}?${params.toString()}`
								: pathname;
							window.history.replaceState(null, "", nextUrl);
						},
					}}
				/>
			</div>
			<div className="flex-1 overflow-y-auto no-scrollbar">
				<div className="grid grid-cols-2 sm:grid-cols-3   lg:grid-cols-4 xl:grid-cols-5 gap-3">
					{filteredCategories.map((category, i) => (
						<Link
							key={category.id}
							href={`${hrefPrefix}/${id}/${category.id}` as string}
							className="group relative flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:translate-y-1"
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
			</div>
			{filteredCategories.length === 0 && (
				<div className="flex flex-col items-center h-full justify-center py-20 text-muted-foreground">
					<FolderOpen className="size-12 mb-4 opacity-30" />
					<p className="text-lg font-medium">{emptyTitle}</p>
					<p className="text-sm">{emptyDescription}</p>
				</div>
			)}
		</div>
	);
}

export function SeriesCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			title="Series"
			placeholder="Search a serie"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no series categories."
			hrefPrefix="/dashboard/series"
			Icon={Tv}
		/>
	);
}

export function MovieCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			title="Movies"
			placeholder="Search a movie"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no movie categories."
			hrefPrefix="/dashboard/movies"
			Icon={Film}
		/>
	);
}

export function TvCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			title="Channels"
			placeholder="Search a channel"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no channel categories."
			hrefPrefix="/dashboard/channels"
			Icon={Radio}
		/>
	);
}

export function SearchSeriesCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			title="Search Series Through Categories"
			placeholder="Search a category"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no series categories."
			hrefPrefix="/dashboard/series/search"
			Icon={Tv}
		/>
	);
}

export function SearchMovieCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			title="Search Movies Through Categories"
			placeholder="Search a category"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no movie categories."
			hrefPrefix="/dashboard/movies/search"
			Icon={Film}
		/>
	);
}

export function SearchTvCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			title="Search Channels Through Categories"
			placeholder="Search a category"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no channel categories."
			hrefPrefix="/dashboard/channels/search"
			Icon={Radio}
		/>
	);
}
