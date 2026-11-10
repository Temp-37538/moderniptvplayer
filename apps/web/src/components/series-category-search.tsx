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
	// Touch screens have no hover: pin and hide show after "Edit".
	const [editing, setEditing] = useState(false);
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
			<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<div className="min-w-0 space-y-2">
					<h1 className={`${PAGE_TITLE_CLASS} truncate pb-1`}>{title}</h1>
					<p className="text-xs md:text-sm text-muted-foreground truncate">
						{playlistName} · {filteredCategories.length}{" "}
						{filteredCategories.length === 1 ? "category" : "categories"}
					</p>
				</div>
				{/* Mobile: search on top, the lock under it. From xl: one row,
				    lock then search, both centered on the same line. */}
				<div className="flex flex-col gap-3 xl:shrink-0 xl:flex-row-reverse xl:items-center xl:gap-5">
					<SearchForm
						placeholder={placeholder}
						className="w-full md:max-w-md xl:w-70"
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
					<div className="flex items-center justify-between gap-3 md:max-w-md xl:contents">
						<label
							htmlFor="adult-category-lock"
							className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground md:text-sm"
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
						<button
							type="button"
							aria-pressed={editing}
							className="-mr-2 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
							onClick={() => setEditing((value) => !value)}
						>
							{editing ? "Done" : "Edit"}
						</button>
					</div>
				</div>
			</div>
			<div
				className={`-m-1 flex-1 overflow-y-auto ${lockPending ? "pointer-events-none opacity-60" : ""}`}
			>
				{/* A typographic index: names in columns, item counts on the
				    right, pin and hide revealed on hover or focus (always on
				    touch screens). */}
				<ul className="columns-1 gap-x-10 p-1 min-[520px]:columns-2 lg:columns-3 2xl:columns-4">
					{filteredCategories.map((category) => (
						<li
							key={category.id}
							className="group relative flex break-inside-avoid items-center gap-2 border-b border-border/40"
						>
							<Link
								href={buildCategoryHref(category.id)}
								className="flex min-w-0 flex-1 items-baseline gap-3 rounded-sm py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{category.pinned ? (
									<Pin
										aria-hidden
										className="size-3 shrink-0 self-center fill-current text-muted-foreground"
									/>
								) : null}
								<span className="min-w-0 flex-1 truncate text-[0.9375rem] decoration-muted-foreground/50 underline-offset-4 group-hover:underline">
									{category.name}
								</span>
								{category.count !== undefined ? (
									<span className="shrink-0 text-xs tabular-nums text-muted-foreground transition-opacity md:group-focus-within:opacity-0 md:group-hover:opacity-0">
										{category.count.toLocaleString("en")}
									</span>
								) : null}
							</Link>
							<div
								className={`${editing ? "flex" : "hidden"} shrink-0 gap-0.5 bg-background transition-opacity md:absolute md:flex md:top-1/2 md:right-0 md:-translate-y-1/2 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100`}
							>
								<button
									type="button"
									aria-pressed={category.pinned}
									aria-label={
										category.pinned
											? `Unpin ${category.name}`
											: `Pin ${category.name}`
									}
									disabled={pendingId === category.id}
									className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
									onClick={() => onTogglePin(category)}
								>
									<Pin
										className={`size-3.5 ${category.pinned ? "fill-current" : ""}`}
									/>
								</button>
								<button
									type="button"
									aria-label={`Hide ${category.name}`}
									disabled={pendingId === category.id}
									className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
									onClick={() => onHide(category)}
								>
									<EyeOff className="size-3.5" />
								</button>
							</div>
						</li>
					))}
				</ul>
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
					<div className="mx-1 mt-8 border-t border-border/40 pt-4">
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
