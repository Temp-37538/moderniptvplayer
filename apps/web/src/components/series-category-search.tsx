"use client";
import { SearchForm } from "@/components/search-form";
import type {
	CategorySearchBaseProps,
	CategorySearchProps,
	ListedCategory,
} from "@/components/types";
import { Switch } from "@/components/ui/switch";
import {
	setAdultCategoryLock,
	toggleCategoryHidden,
	toggleCategoryPin,
} from "@/server/category-preference-actions";
import type { CategoryKind } from "@/server/category-preference-policy";
import { Eye, EyeOff, Film, FolderOpen, Pin, Radio, Tv } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function toLowerCaseSafe(value: unknown) {
	return value === undefined || value === null
		? ""
		: String(value).toLowerCase();
}

function orderCategories(categories: ListedCategory[]) {
	const pinned = categories.filter((category) => category.pinned);
	const rest = categories.filter((category) => !category.pinned);
	return [...pinned, ...rest];
}

function CategorySearchBase({
	id,
	playlistName,
	categories,
	hiddenCategories,
	lockAdultCategories,
	title,
	placeholder,
	emptyTitle,
	emptyDescription,
	hrefPrefix,
	kind,
}: CategorySearchBaseProps & { kind: CategoryKind }) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
	const [visible, setVisible] = useState(() => orderCategories(categories));
	const [hidden, setHidden] = useState(hiddenCategories);
	const [adultLocked, setAdultLocked] = useState(lockAdultCategories);
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [lockPending, setLockPending] = useState(false);

	useEffect(() => {
		setQuery(searchParams.get("q") ?? "");
	}, [searchParams]);

	useEffect(() => {
		setVisible(orderCategories(categories));
		setHidden(hiddenCategories);
		setAdultLocked(lockAdultCategories);
	}, [categories, hiddenCategories, lockAdultCategories]);

	const normalized = query.trim().toLowerCase();
	const filteredCategories = normalized
		? visible.filter((category) =>
				toLowerCaseSafe(category.name).includes(normalized),
			)
		: visible;

	const buildCategoryHref = (categoryId: string) =>
		`${hrefPrefix}/${id}/${categoryId}` as Route;

	async function onTogglePin(category: ListedCategory) {
		const previous = visible;
		setPendingId(category.id);
		setVisible((current) =>
			orderCategories(
				current.map((item) =>
					item.id === category.id ? { ...item, pinned: !item.pinned } : item,
				),
			),
		);
		try {
			await toggleCategoryPin(id, kind, category.id);
			router.refresh();
		} catch {
			setVisible(previous);
			toast.error(`Unable to update pin for ${category.name}`);
		} finally {
			setPendingId(null);
		}
	}

	async function onHide(category: ListedCategory) {
		const previousVisible = visible;
		const previousHidden = hidden;
		setPendingId(category.id);
		setVisible((current) => current.filter((item) => item.id !== category.id));
		setHidden((current) => [
			category,
			...current.filter((item) => item.id !== category.id),
		]);
		try {
			await toggleCategoryHidden(id, kind, category.id);
			router.refresh();
		} catch {
			setVisible(previousVisible);
			setHidden(previousHidden);
			toast.error(`Unable to hide ${category.name}`);
		} finally {
			setPendingId(null);
		}
	}

	async function onUnhide(category: ListedCategory) {
		const previousVisible = visible;
		const previousHidden = hidden;
		setPendingId(category.id);
		setHidden((current) => current.filter((item) => item.id !== category.id));
		setVisible((current) =>
			orderCategories([
				...current.filter((item) => item.id !== category.id),
				category,
			]),
		);
		try {
			await toggleCategoryHidden(id, kind, category.id);
			router.refresh();
		} catch {
			setVisible(previousVisible);
			setHidden(previousHidden);
			toast.error(`Unable to show ${category.name}`);
		} finally {
			setPendingId(null);
		}
	}

	async function onLockChange(next: boolean) {
		const previous = adultLocked;
		setAdultLocked(next);
		setLockPending(true);
		try {
			await setAdultCategoryLock(next);
			router.refresh();
		} catch {
			setAdultLocked(previous);
			toast.error("Unable to update the adult category lock");
		} finally {
			setLockPending(false);
		}
	}

	return (
		<div className="h-full flex flex-col gap-3 md:gap-4  scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-border/50 scrollbar-track-border/20">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
				<div className="flex items-center gap-2.5 md:gap-3 min-w-0">
					<div className="min-w-0">
						<h1 className="text-lg md:text-2xl font-bold tracking-tight truncate">
							{title}
						</h1>
						<p className="text-xs md:text-sm text-muted-foreground truncate">
							{playlistName} {filteredCategories.length} categories
						</p>
					</div>
				</div>
				<div className="flex flex-col gap-2 md:items-end">
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
					<label
						htmlFor="adult-category-lock"
						className="flex items-center gap-2 text-xs text-muted-foreground"
					>
						<Switch
							id="adult-category-lock"
							size="sm"
							checked={adultLocked}
							disabled={lockPending}
							onCheckedChange={onLockChange}
						/>
						Lock adult categories
					</label>
				</div>
			</div>
			<div
				className={`flex-1 overflow-y-auto ${lockPending ? "pointer-events-none opacity-60" : ""}`}
			>
				<div className="grid grid-cols-2 sm:grid-cols-3   lg:grid-cols-4 xl:grid-cols-5 gap-3">
					{filteredCategories.map((category) => (
						<div
							key={category.id}
							className="group relative flex flex-col rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:translate-y-1"
						>
							<div className="absolute top-2 right-2 z-10 flex gap-1">
								<button
									type="button"
									aria-pressed={category.pinned}
									aria-label={
										category.pinned
											? `Unpin ${category.name}`
											: `Pin ${category.name}`
									}
									disabled={pendingId === category.id}
									className="inline-flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground hover:text-foreground disabled:opacity-50"
									onClick={() => onTogglePin(category)}
								>
									<Pin
										className={`size-3.5 ${category.pinned ? "fill-current text-primary" : ""}`}
									/>
								</button>
								<button
									type="button"
									aria-label={`Hide ${category.name}`}
									disabled={pendingId === category.id}
									className="inline-flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground hover:text-foreground disabled:opacity-50"
									onClick={() => onHide(category)}
								>
									<EyeOff className="size-3.5" />
								</button>
							</div>
							<Link
								href={buildCategoryHref(category.id)}
								className="flex flex-col items-center gap-2 md:gap-3 p-3 pt-9 md:p-5 md:pt-10"
							>
								<div className="flex items-center justify-center size-8 md:size-10 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200">
									<FolderOpen className="size-4 md:size-5" />
								</div>
								<span className="text-xs md:text-sm font-medium text-center leading-tight line-clamp-2">
									{category.name}
								</span>
							</Link>
						</div>
					))}
				</div>
				{filteredCategories.length === 0 && (
					<div className="flex flex-col items-center h-full justify-center py-20 text-muted-foreground">
						<FolderOpen className="size-12 mb-4 opacity-30" />
						<p className="text-base md:text-lg font-medium">{emptyTitle}</p>
						<p className="text-xs md:text-sm">{emptyDescription}</p>
					</div>
				)}
				{hidden.length > 0 && (
					<details className="mt-4 rounded-xl border border-border/50 bg-card px-4 py-3">
						<summary className="cursor-pointer text-sm font-medium">
							Hidden ({hidden.length})
						</summary>
						<ul className="mt-3 flex flex-col gap-2">
							{hidden.map((category) => (
								<li
									key={category.id}
									className="flex items-center justify-between gap-3 text-sm"
								>
									<span className="min-w-0 truncate text-muted-foreground">
										{category.name}
									</span>
									<button
										type="button"
										aria-label={`Show ${category.name}`}
										disabled={pendingId === category.id}
										className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
										onClick={() => onUnhide(category)}
									>
										<Eye className="size-3.5" />
										Show
									</button>
								</li>
							))}
						</ul>
					</details>
				)}
			</div>
		</div>
	);
}

export function SeriesCategorySearch(props: CategorySearchProps) {
	return (
		<CategorySearchBase
			{...props}
			kind="series"
			title="Series"
			placeholder="Search a category"
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
			kind="movie"
			title="Movies"
			placeholder="Search a category"
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
			kind="channel"
			title="Channels"
			placeholder="Search a category"
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
			kind="series"
			title="Search series by category"
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
			kind="movie"
			title="Search movies by category"
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
			kind="channel"
			title="Search channels by category"
			placeholder="Search a category"
			emptyTitle="No categories found"
			emptyDescription="This playlist has no channel categories."
			hrefPrefix="/dashboard/channels/search"
			Icon={Radio}
		/>
	);
}
