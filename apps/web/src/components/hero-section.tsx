"use client";
import { HeroHeader } from "@/components/header";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
	return (
		<>
			<HeroHeader />
			<main className="overflow-hidden">
				<section>
					<div className="relative isolate z-110 flex min-h-svh flex-col justify-end pb-16 md:pb-24">
						<div className="relative mx-auto max-w-7xl px-6">
							<div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
								<div className="animate-hero-fade">
									<Link
										href="/dashboard/addplaylist"
										className="hover:bg-[oklch(0.76_0.15_47)]/10 hover:border-[oklch(0.76_0.15_47)]/20 bg-[oklch(0.215_0.014_32)] group mx-auto flex w-fit items-center gap-4 rounded-full border border-[oklch(0.29_0.015_32)] p-1 pl-4 shadow-[0rem_0.5rem_1rem_0rem_hsl(20_35%_2%/0.4),0rem_2px_4px_-1px_hsl(20_35%_2%/0.4)] transition-colors duration-300"
									>
										<span className="text-[oklch(0.92_0.025_60)] group-hover:text-[oklch(0.92_0.025_60)] text-sm transition-colors">
											Add a playlist. Start watching.
										</span>
										<span className="block h-4 w-0.5 bg-[oklch(0.76_0.15_47)]/40 group-hover:bg-[oklch(0.76_0.15_47)]/60 transition-colors"></span>

										<div className="bg-[oklch(0.76_0.15_47)] group-hover:bg-[oklch(0.76_0.15_47)]/80 text-[oklch(0.14_0.012_32)] size-6 overflow-hidden rounded-full duration-500">
											<div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
												<span className="flex size-6">
													<ArrowRight className="m-auto size-3" />
												</span>
												<span className="flex size-6">
													<ArrowRight className="m-auto size-3" />
												</span>
											</div>
										</div>
									</Link>
								</div>

								<h1
									className="mx-auto font-serif italic mt-6 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-8 xl:text-[4.2rem] text-[oklch(0.92_0.025_60)] animate-hero-fade"
									style={{ animationDelay: "0.1s" }}
								>
									Your IPTV Library
								</h1>
								<h1
									className="mx-auto font-serif italic max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[4.2rem] text-[oklch(0.92_0.025_60)] animate-hero-fade"
									style={{ animationDelay: "0.2s" }}
								>
									Simplified
								</h1>
								<p
									className="mx-auto mt-6 max-w-2xl text-balance text-base text-[oklch(0.71_0.022_58)] animate-hero-fade"
									style={{ animationDelay: "0.5s" }}
								>
									Import playlists with Xtream Codes or M3U and enjoy a clean
									interface for live TV, movies, and series.
								</p>

								<div className="mt-8 flex flex-col items-center justify-center gap-2 md:flex-row">
									<div
										className="bg-[oklch(0.92_0.025_60)]/10 rounded-[calc(var(--radius-xl)+0.125rem)] border border-[oklch(0.29_0.015_32)] p-0.5 animate-hero-fade"
										style={{ animationDelay: "0.75s" }}
									>
										<Button
											size="lg"
											className="rounded-xl px-5 text-base bg-[oklch(0.76_0.15_47)] text-[oklch(0.14_0.012_32)] hover:bg-[oklch(0.76_0.15_47)]/90"
											render={(props) => (
												<Link href="/dashboard/movies" {...props} />
											)}
											nativeButton={false}
										>
											<span className="text-nowrap">Watch a movie !</span>
										</Button>
									</div>
									<Button
										size="lg"
										className="rounded-xl px-5 text-base bg-[oklch(0.5_0.07_43)] text-[oklch(0.94_0.02_60)] hover:bg-[oklch(0.5_0.07_43)]/90 animate-hero-fade"
										style={{ animationDelay: "0.8s" }}
										render={(props) => (
											<Link href="/dashboard/channels" {...props} />
										)}
										nativeButton={false}
									>
										<span className="text-nowrap">Browse Channels</span>
									</Button>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</>
	);
}
