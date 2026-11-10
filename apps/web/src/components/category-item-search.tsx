"use client";

import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { toSafeImageSrc } from "@/lib/image-url";
import { Film, Loader2, Radio, SearchIcon, Tv } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 20;

type SearchSection = "channels" | "movies" | "series";

type SearchResultItem = {
	id: string;
	name: string;
	categoryId: string;
	score: number;
	poster?: string;
	logo?: string;
};

type SearchResponse = {
	items: SearchResultItem[];
	error?: string;
};

/** What the last finished request answered, and for which query. */
type SearchOutcome = {
	query: string;
	items: SearchResultItem[];
	error: string | null;
};

type CategoryItemSearchProps = {
	section: SearchSection;
	playlistId: string;
	categoryId: string;
	/** Category name for the page title, when the page knows it. */
	categoryName?: string | null;
};

type ImageWithFallbackProps = {
	src?: string;
	alt: string;
	className: string;
	fallback: ReactNode;
};

function ImageWithFallback({
	src,
	alt,
	className,
	fallback,
}: ImageWithFallbackProps) {
	const [failed, setFailed] = useState(false);
	const previousSrcRef = useRef(src);

	useEffect(() => {
		if (previousSrcRef.current !== src) {
			previousSrcRef.current = src;
			setFailed(false);
		}
	}, [src]);

	if (!src || failed) {
		return <>{fallback}</>;
	}

	return (
		<Image
			src={src}
			alt={alt}
			className={className}
			width={128}
			height={128}
			unoptimized
			onError={() => setFailed(true)}
		/>
	);
}

const SECTION_CONFIG: Record<
	SearchSection,
	{
		title: string;
		placeholder: string;
		Icon: ComponentType<{ className?: string }>;
	}
> = {
	channels: {
		title: "Search channels",
		placeholder: "Channel name",
		Icon: Radio,
	},
	movies: {
		title: "Search movies",
		placeholder: "Movie title",
		Icon: Film,
	},
	series: {
		title: "Search series",
		placeholder: "Series title",
		Icon: Tv,
	},
};

async function readErrorMessage(response: Response) {
	try {
		const payload = (await response.json()) as SearchResponse;
		if (payload.error) {
			return payload.error;
		}
	} catch {}
	return "Search request failed.";
}

export function CategoryItemSearch({
	section,
	playlistId,
	categoryId,
	categoryName,
}: CategoryItemSearchProps) {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [outcome, setOutcome] = useState<SearchOutcome | null>(null);

	const { title, placeholder } = SECTION_CONFIG[section];
	const normalizedQuery = query.trim();
	const isQueryValid = normalizedQuery.length >= MIN_QUERY_LENGTH;
	// Until the answer for what is typed now arrives (debounce included),
	// the search is pending: no "No results" for an answer not given yet.
	const isPending = isQueryValid && outcome?.query !== normalizedQuery;
	const items = outcome?.items ?? [];
	const error = isPending ? null : (outcome?.error ?? null);

	useEffect(() => {
		if (!isQueryValid) {
			setDebouncedQuery("");
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setDebouncedQuery(normalizedQuery);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [isQueryValid, normalizedQuery]);

	useEffect(() => {
		if (!debouncedQuery) {
			return;
		}

		const abortController = new AbortController();
		const searchParams = new URLSearchParams({
			playlistId,
			categoryId,
			q: debouncedQuery,
			limit: String(MAX_RESULTS),
		});

		fetch(`/api/${section}/search?${searchParams.toString()}`, {
			signal: abortController.signal,
			cache: "no-store",
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(await readErrorMessage(response));
				}

				return (await response.json()) as SearchResponse;
			})
			.then((payload) => {
				setOutcome({
					query: debouncedQuery,
					items: Array.isArray(payload.items) ? payload.items : [],
					error: null,
				});
			})
			.catch((fetchError: unknown) => {
				if (
					fetchError &&
					typeof fetchError === "object" &&
					"name" in fetchError &&
					fetchError.name === "AbortError"
				) {
					return;
				}

				setOutcome({
					query: debouncedQuery,
					items: [],
					error:
						fetchError instanceof Error
							? fetchError.message
							: "Search request failed.",
				});
			});

		return () => {
			abortController.abort();
		};
	}, [categoryId, debouncedQuery, playlistId, section]);

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<div className="space-y-2">
						<h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance break-words md:text-5xl">
							{categoryName || title}
						</h1>
						<p className="text-sm text-muted-foreground">
							{categoryName
								? `Search ${section} in this category`
								: "Search through this category only"}
						</p>
					</div>
				</div>
				<div className="relative w-full max-w-3xl">
					<SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50 select-none" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={placeholder}
						aria-label={`Search ${section} in this category`}
						className="h-12 pl-9 text-base"
					/>
				</div>
				<output aria-live="polite" className="min-h-5 text-sm">
					{!isQueryValid ? null : isPending ? (
						<span className="inline-flex items-center gap-2 text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							Searching...
						</span>
					) : error ? (
						<span className="text-red-500">{error}</span>
					) : (
						<span className="text-muted-foreground">
							{items.length} result{items.length === 1 ? "" : "s"}
						</span>
					)}
				</output>
			</div>

			<div
				aria-busy={isPending}
				className={`flex-1 overflow-y-auto pb-10 transition-opacity ${
					isPending ? "opacity-60" : ""
				}`}
			>
				{!isQueryValid ? (
					<EmptyState
						title="Start typing to search"
						description={`Type at least ${MIN_QUERY_LENGTH} characters.`}
					/>
				) : items.length === 0 ? (
					isPending || error ? null : (
						<EmptyState
							title="No results"
							description="Try another term in this category."
						/>
					)
				) : section === "channels" ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{items.map((item) => {
							const safeLogoSrc = toSafeImageSrc(item.logo);
							return (
								<Link
									key={item.id}
									href={
										`/dashboard/channels/${playlistId}/${item.categoryId}/${item.id}` as Route
									}
									className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5"
								>
									<div className="flex items-center justify-center size-12 rounded-lg bg-muted overflow-hidden shrink-0">
										<ImageWithFallback
											src={safeLogoSrc}
											alt={item.name}
											className="size-full object-contain p-1"
											fallback={
												<Radio className="size-5 text-muted-foreground/40" />
											}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-sm font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
											{item.name}
										</h3>
									</div>
								</Link>
							);
						})}
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
						{items.map((item) => {
							const safePosterSrc = toSafeImageSrc(item.poster);
							return (
								<Link
									key={item.id}
									href={
										`/dashboard/${section}/${playlistId}/${item.categoryId}/${item.id}` as Route
									}
									className="group"
								>
									<div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted border border-border/30">
										<ImageWithFallback
											src={safePosterSrc}
											alt={item.name}
											className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
											fallback={
												<div className="flex items-center justify-center size-full text-muted-foreground">
													{section === "movies" ? (
														<Film className="size-10 opacity-50" />
													) : (
														<Tv className="size-10 opacity-50" />
													)}
												</div>
											}
										/>
									</div>
									<h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
										{item.name}
									</h3>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
