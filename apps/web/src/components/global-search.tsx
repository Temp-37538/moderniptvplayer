"use client";

import { EmptyState } from "@/components/empty-state";
import {
	formatRetryWait,
	SEARCH_POLL_INTERVAL_MS,
	SEARCH_POLL_WINDOW_MS,
} from "@/lib/global-search-timing";
import {
	parseSearchKind,
	type SearchKind,
	searchQueryString,
} from "@/lib/global-search-url";
import { toSafeImageSrc } from "@/lib/image-url";
import { Film, Radio, Search, Tv } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_POLLS =
	Math.ceil(SEARCH_POLL_WINDOW_MS / SEARCH_POLL_INTERVAL_MS) + 1;
const SEARCH_LIMIT = 20;

type ResultKind = Exclude<SearchKind, "all">;
type SearchStatus =
	| "idle"
	| "loading"
	| "building"
	| "unavailable"
	| "ready"
	| "error";

type SearchResult = {
	kind: ResultKind;
	id: string;
	name: string;
	image: string | null;
	categoryId: string;
	href: string;
};

type SearchPayload = {
	status?: "ready" | "building" | "unavailable";
	stale?: boolean;
	results?: SearchResult[];
	/** Seconds before "Try again" can start a new sync. */
	retryAfter?: number;
	error?: string;
};

const FILTERS: Array<{ value: SearchKind; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "channel", label: "Channels" },
	{ value: "movie", label: "Movies" },
	{ value: "series", label: "Series" },
];

const GROUPS: Array<{
	kind: ResultKind;
	title: string;
}> = [
	{ kind: "channel", title: "Channels" },
	{ kind: "movie", title: "Movies" },
	{ kind: "series", title: "Series" },
];

function ResultIcon({ kind }: { kind: ResultKind }) {
	if (kind === "channel") {
		return <Radio className="size-6 text-muted-foreground/50" />;
	}
	if (kind === "movie") {
		return <Film className="size-6 text-muted-foreground/50" />;
	}
	return <Tv className="size-6 text-muted-foreground/50" />;
}

function ResultThumbnail({ result }: { result: SearchResult }) {
	const src = toSafeImageSrc(result.image ?? undefined);
	const [failedSrc, setFailedSrc] = useState<string | null>(null);

	if (!src || failedSrc === src) {
		return <ResultIcon kind={result.kind} />;
	}

	return (
		<Image
			src={src}
			alt={result.name}
			width={96}
			height={128}
			unoptimized
			className={
				result.kind === "channel"
					? "size-full object-contain p-1"
					: "size-full object-cover"
			}
			onError={() => setFailedSrc(src)}
		/>
	);
}

export function GlobalSearch({
	playlistId,
	playlistName,
}: {
	playlistId: string;
	playlistName: string;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	// Back from a result or a reload starts from the search in the address.
	const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
	const [debouncedQuery, setDebouncedQuery] = useState(() =>
		(searchParams.get("q") ?? "").trim(),
	);
	const [kind, setKind] = useState<SearchKind>(() =>
		parseSearchKind(searchParams.get("kind")),
	);
	const [status, setStatus] = useState<SearchStatus>("idle");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [stale, setStale] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [retryAfter, setRetryAfter] = useState(0);
	// The last retry the server has seen. Only the first request after a click
	// is an explicit retry, so polling never restarts a sync that just failed.
	const sentRetry = useRef(0);

	const normalizedQuery = query.trim();
	const queryIsValid = normalizedQuery.length >= 2;
	const isDebouncing = queryIsValid && normalizedQuery !== debouncedQuery;
	const displayedStatus = isDebouncing ? "loading" : status;

	// Replaces the entry instead of adding one per key press, like the
	// category search does.
	function updateSearch(next: { q: string; kind: SearchKind }) {
		setQuery(next.q);
		setKind(next.kind);
		window.history.replaceState(
			null,
			"",
			`${pathname}${searchQueryString(window.location.search, next)}`,
		);
	}

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedQuery(query.trim());
		}, SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timeout);
	}, [query]);

	useEffect(() => {
		if (debouncedQuery.length < 2) {
			setResults([]);
			setStale(false);
			setError(null);
			setStatus("idle");
			return;
		}

		const controller = new AbortController();
		let pollTimer: number | undefined;

		async function runSearch() {
			setStatus("loading");
			setResults([]);
			setStale(false);
			setError(null);
			setRetryAfter(0);

			const params = new URLSearchParams({
				playlistId,
				q: debouncedQuery,
				kind,
				limit: String(SEARCH_LIMIT),
			});

			try {
				for (let attempt = 0; attempt < SEARCH_MAX_POLLS; attempt += 1) {
					if (sentRetry.current !== retryCount) {
						params.set("retry", "1");
					}
					const response = await fetch(`/api/search?${params.toString()}`, {
						signal: controller.signal,
						cache: retryCount > 0 ? "reload" : "no-store",
					});
					sentRetry.current = retryCount;
					params.delete("retry");
					const payload = (await response
						.json()
						.catch(() => ({}))) as SearchPayload;

					if (response.status === 202 || payload.status === "building") {
						setStatus("building");
						if (attempt === SEARCH_MAX_POLLS - 1) {
							setError("The index is still building. Try again.");
							setStatus("error");
							return;
						}
						await new Promise<void>((resolve) => {
							pollTimer = window.setTimeout(resolve, SEARCH_POLL_INTERVAL_MS);
						});
						if (controller.signal.aborted) {
							return;
						}
						continue;
					}

					if (response.status === 503 || payload.status === "unavailable") {
						setResults([]);
						setRetryAfter(
							typeof payload.retryAfter === "number" ? payload.retryAfter : 0,
						);
						setStatus("unavailable");
						return;
					}

					if (!response.ok) {
						throw new Error(payload.error || "Search request failed.");
					}

					setResults(Array.isArray(payload.results) ? payload.results : []);
					setStale(payload.stale === true);
					setStatus("ready");
					return;
				}
			} catch (fetchError) {
				if (controller.signal.aborted) {
					return;
				}
				setResults([]);
				setError(
					fetchError instanceof Error
						? fetchError.message
						: "Search request failed.",
				);
				setStatus("error");
			}
		}

		void runSearch();

		return () => {
			controller.abort();
			if (pollTimer !== undefined) {
				window.clearTimeout(pollTimer);
			}
		};
	}, [debouncedQuery, kind, playlistId, retryCount]);

	const liveMessage =
		displayedStatus === "idle"
			? "Type at least 2 characters to search."
			: displayedStatus === "loading"
				? "Searching..."
				: displayedStatus === "building"
					? ""
					: displayedStatus === "unavailable"
						? "The index is temporarily unavailable."
						: displayedStatus === "error"
							? (error ?? "Search request failed.")
							: `${results.length} result${results.length === 1 ? "" : "s"} found.`;

	return (
		<div className="flex h-full flex-col gap-6">
			<header className="space-y-1">
				<h1 className="text-3xl font-bold tracking-tight">Search</h1>
				<p className="text-sm text-muted-foreground">
					Search channels, movies, and series in {playlistName}.
				</p>
			</header>

			<div className="space-y-4">
				<div className="relative w-full max-w-3xl">
					<label className="sr-only" htmlFor="global-catalog-search">
						Search channels, movies, and series
					</label>
					<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						id="global-catalog-search"
						type="search"
						value={query}
						onChange={(event) => updateSearch({ q: event.target.value, kind })}
						placeholder="Search the entire playlist..."
						autoComplete="off"
						className="h-12 w-full rounded-lg border border-input bg-background pr-4 pl-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
					/>
				</div>

				<fieldset className="flex flex-wrap gap-2">
					<legend className="sr-only">Filter search results</legend>
					{FILTERS.map((filter) => (
						<button
							key={filter.value}
							type="button"
							aria-pressed={kind === filter.value}
							onClick={() => updateSearch({ q: query, kind: filter.value })}
							className={
								kind === filter.value
									? "rounded-full border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
									: "rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
							}
						>
							{filter.label}
						</button>
					))}
				</fieldset>

				<output
					aria-live="polite"
					className="min-h-5 text-sm text-muted-foreground"
				>
					{liveMessage}
					{displayedStatus === "ready" && stale
						? " Showing cached results while the index refreshes."
						: ""}
				</output>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pb-10">
				{!queryIsValid ? (
					<EmptyState
						title="Start typing to search"
						description="Use at least 2 characters to search your entire playlist."
					/>
				) : displayedStatus === "building" || displayedStatus === "loading" ? (
					<output className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
						<span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
						{displayedStatus === "building"
							? "Building the index, this can take a few minutes"
							: "Searching..."}
					</output>
				) : displayedStatus === "unavailable" ? (
					<div className="flex flex-col items-start gap-3 py-8">
						<p className="text-sm text-muted-foreground">
							The catalogue index could not be built.{" "}
							{retryAfter > 0
								? `You can try again in ${formatRetryWait(retryAfter)}.`
								: "Please try again."}
						</p>
						<button
							type="button"
							onClick={() => setRetryCount((value) => value + 1)}
							className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
						>
							Try again
						</button>
					</div>
				) : displayedStatus === "error" ? (
					<div className="flex flex-col items-start gap-3 py-8">
						<p className="text-sm text-destructive">
							{error ?? "Search request failed."}
						</p>
						<button
							type="button"
							onClick={() => setRetryCount((value) => value + 1)}
							className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
						>
							Try again
						</button>
					</div>
				) : status === "ready" && results.length === 0 ? (
					<EmptyState
						title="No results"
						description="Try another search term or content type."
					/>
				) : (
					<div className="space-y-8">
						{GROUPS.map((group) => {
							const grouped = results.filter(
								(result) => result.kind === group.kind,
							);
							if (grouped.length === 0) {
								return null;
							}
							return (
								<section
									key={group.kind}
									aria-labelledby={`global-search-${group.kind}`}
									className="space-y-3"
								>
									<h2
										id={`global-search-${group.kind}`}
										className="text-lg font-semibold tracking-tight"
									>
										{group.title}
										<span className="ml-2 text-sm font-normal text-muted-foreground">
											({grouped.length})
										</span>
									</h2>
									<div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
										{grouped.map((result) => (
											<Link
												key={`${result.kind}-${result.id}`}
												href={result.href as Route}
												className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-colors hover:border-primary/30 hover:bg-accent/50"
											>
												<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
													<ResultThumbnail result={result} />
												</div>
												<span className="min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-primary">
													{result.name}
												</span>
											</Link>
										))}
									</div>
								</section>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
