"use client";
import { PAGE_TITLE_CLASS } from "@/components/page-container";
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
import { useEffect, useId, useState } from "react";
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
	const [hiddenOpen, setHiddenOpen] = useState(false);
	const hiddenListId = useId();

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
			toast.success(`${category.name} hidden`, {
				action: { label: "Undo", onClick: () => onUnhide(category) },
			});
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
				<div className="flex items-center justify-between gap-2.5 md:gap-3 min-w-0">
					<div className="min-w-0 space-y-2">
						<h1 className={`${PAGE_TITLE_CLASS} truncate pb-1`}>{title}</h1>
						<p className="text-xs md:text-sm text-muted-foreground truncate">
							{playlistName} · {filteredCategories.length}{" "}
							{filteredCategories.length === 1 ? "category" : "categories"}
						</p>
					</div>
					<label
						htmlFor="adult-category-lock-mobile"
						className="flex md:hidden items-center gap-2 text-xs text-muted-foreground shrink-0"
					>
						<Switch
							id="adult-category-lock-mobile"
							size="sm"
							checked={adultLocked}
							disabled={lockPending}
							onCheckedChange={onLockChange}
						/>
						Lock adult categories
					</label>
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
						className="hidden md:flex items-center gap-2 text-xs text-muted-foreground"
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
				className={`-m-1 flex-1 overflow-y-auto ${lockPending ? "pointer-events-none opacity-60" : ""}`}
			>
				<div className="grid grid-cols-1 gap-2 p-1 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{filteredCategories.map((category) => (
						<div
							key={category.id}
							className="group relative flex min-h-16 items-center rounded-xl border border-border/60 bg-card transition-colors hover:border-border hover:bg-muted/50"
						>
							<Link
								href={buildCategoryHref(category.id)}
								className="flex min-h-16 flex-1 items-center rounded-xl py-3 pr-18 pl-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
							>
								<span className="line-clamp-2 text-sm font-medium leading-snug">
									{category.name}
								</span>
							</Link>
							<div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 gap-0.5">
								<button
									type="button"
									aria-pressed={category.pinned}
									aria-label={
										category.pinned
											? `Unpin ${category.name}`
											: `Pin ${category.name}`
									}
									disabled={pendingId === category.id}
									className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${category.pinned ? "" : "md:opacity-0"}`}
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
									className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
									onClick={() => onHide(category)}
								>
									<EyeOff className="size-3.5" />
								</button>
							</div>
						</div>
					))}
				</div>
				{filteredCategories.length === 0 && (
					<div className="flex flex-col items-center h-full justify-center py-20 text-center text-muted-foreground">
						<FolderOpen className="size-12 mb-4 opacity-30" />
						<p className="text-base md:text-lg font-medium">
							{normalized
								? "No matching categories"
								: hidden.length > 0
									? "All categories are hidden"
									: emptyTitle}
						</p>
						<p className="text-xs md:text-sm">
							{normalized
								? `No category name contains "${query.trim()}".`
								: hidden.length > 0
									? "Show a hidden category below to browse it."
									: emptyDescription}
						</p>
					</div>
				)}
				{hidden.length > 0 && (
					<div className="mt-4 rounded-xl border border-border/50 bg-card px-4 py-3">
						<button
							type="button"
							className="flex w-full cursor-pointer items-center justify-between rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => setHiddenOpen((open) => !open)}
							aria-expanded={hiddenOpen}
							aria-controls={hiddenListId}
						>
							<span>Hidden ({hidden.length})</span>
							<span
								className={`transition-transform duration-200 ${hiddenOpen ? "rotate-180" : ""}`}
							>
								▾
							</span>
						</button>
						<div
							id={hiddenListId}
							inert={!hiddenOpen}
							className={`grid transition-all duration-200 ease-out ${
								hiddenOpen
									? "grid-rows-[1fr] opacity-100"
									: "grid-rows-[0fr] opacity-0"
							}`}
						>
							<div className="overflow-hidden">
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
												className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
												onClick={() => onUnhide(category)}
											>
												<Eye className="size-3.5" />
												Show
											</button>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
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
