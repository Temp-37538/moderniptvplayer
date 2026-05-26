import { HeroHeader } from "@/components/header";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
	return (
		<>
			<HeroHeader />
			<main className="overflow-hidden">
				<section>
					<div className="relative isolate z-110 pt-24 md:pt-36">
						<div className="relative mx-auto max-w-7xl px-6">
							<div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
								<div className="animate-hero-fade">
									<Link
										href="/auth/sign-in"
										className="hover:bg-primary/10 hover:border-primary dark:hover:bg-primary/10 dark:hover:border-primary/20 bg-background dark:bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border border-primary dark:border-border p-1 pl-4 shadow-md transition-colors duration-300"
									>
										<span className="text-primary dark:text-foreground group-hover:text-primary-foreground dark:group-hover:text-foreground text-sm transition-colors">
											Add a playlist. Start watching.
										</span>
										<span className="block h-4 w-0.5 bg-primary/30 dark:bg-primary/40 group-hover:bg-primary-foreground/30 dark:group-hover:bg-primary/60 transition-colors"></span>

										<div className="bg-primary dark:bg-primary group-hover:bg-primary/90 dark:group-hover:bg-primary/80 text-primary-foreground group-hover:text-primary-foreground size-6 overflow-hidden rounded-full duration-500">
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
									className="mx-auto font-serif italic mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem] animate-hero-fade"
									style={{ animationDelay: "0.1s" }}
								>
									Your IPTV Library
								</h1>
								<br />
								<h1
									className="mx-auto font-serif italic max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl  xl:text-[5.25rem] animate-hero-fade"
									style={{ animationDelay: "0.2s" }}
								>
									Simplified
								</h1>
								<p
									className="mx-auto mt-8 max-w-2xl text-balance text-lg animate-hero-fade"
									style={{ animationDelay: "0.5s" }}
								>
									Import playlists with Xtream Codes or M3U and enjoy
									a clean interface for live TV, movies, and series.
								</p>

								<div className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
									<div
										className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5 animate-hero-fade"
										style={{ animationDelay: "0.75s" }}
									>
										<Button
											size="lg"
											className="rounded-xl px-5 text-base"
											render={<Link href="/auth/sign-in" />}
											nativeButton={false}
										>
											<span className="text-nowrap">Watch a movie !</span>
										</Button>
									</div>
									<Button
										size="lg"
										variant="secondary"
										className=" rounded-xl px-5 animate-hero-fade"
										style={{ animationDelay: "0.8s" }}
										render={<Link href="/auth/sign-in" />}
										nativeButton={false}
									>
										<span className="text-nowrap">Browse Channels</span>
									</Button>
								</div>
							</div>
						</div>

						<div
							className="mask-b-from-55% relative mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20 animate-hero-fade"
							style={{ animationDelay: "0.85s" }}
						>
							<div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
								<Image
									className="aspect-15/8 relative hidden rounded-2xl dark:block"
									src="/dark_.webp"
									alt="app screen"
									loading="eager"
									fetchPriority="high"
									sizes="(max-width: 1258px) 100vw, 1258px"
									width={1600}
									height={800}
								/>
								<Image
									className="aspect-15/8 relative rounded-2xl block dark:hidden"
									src="/light_.webp"
									alt="app screen"
									loading="lazy"
									sizes="(max-width: 1258px) 100vw, 1258px"
									width={1600}
									height={800}
								/>
							</div>
						</div>
					</div>
				</section>
			</main>
		</>
	);
}
