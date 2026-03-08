import { HeroHeader } from "@/components/header";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AnimatedGroup, type AnimatedGroupProps } from "./ui/animated-group";
import { TextEffect } from "./ui/text-effect";

type GroupVariants = NonNullable<AnimatedGroupProps["variants"]>;

const transitionVariants = {
	item: {
		hidden: {
			opacity: 0,
			filter: "blur(12px)",
			y: 12,
		},
		visible: {
			opacity: 1,
			filter: "blur(0px)",
			y: 0,
			transition: {
				type: "spring",
				bounce: 0.3,
				duration: 1.5,
			},
		},
	},
} satisfies GroupVariants;

const backgroundVariants = {
	container: {
		visible: {
			transition: {
				delayChildren: 1,
			},
		},
	},
	item: {
		hidden: {
			opacity: 0,
			y: 20,
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				type: "spring",
				bounce: 0.3,
				duration: 2,
			},
		},
	},
} satisfies GroupVariants;

const staggeredVariants = {
	container: {
		visible: {
			transition: {
				staggerChildren: 0.05,
				delayChildren: 0.75,
			},
		},
	},
	...transitionVariants,
} satisfies GroupVariants;

export default function HeroSection() {
	return (
		<>
			<HeroHeader />
			<main className="overflow-hidden  ">
				<div
					aria-hidden
					className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
				>
					<div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
					<div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
					<div className="h-320 -translate-y-87.5  absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
				</div>
				<section>
					<div className="relative pt-24 md:pt-36">
						<AnimatedGroup
							variants={backgroundVariants}
							className="absolute inset-x-0 bottom-0 top-20 -z-20 overflow-hidden mask-[linear-gradient(to_bottom,transparent_0%,black_18%,black_74%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_74%,transparent_100%)] lg:top-12"
						>
							<Image
								src={`/hero_bg.webp`}
								alt="background"
								className="block size-full scale-[1.03] brightness-[0.58] grayscale blur-[2px]"
								loading="eager"
								width={3840}
								height={2160}
							/>
						</AnimatedGroup>

						<div
							aria-hidden
							className="absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-white via-white/90 to-transparent blur-3xl dark:hidden"
						/>

						<div
							aria-hidden
							className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"
						/>

						<div className="mx-auto max-w-7xl px-6">
							<div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
								<AnimatedGroup variants={transitionVariants}>
									<Link
										href="/dashboard/addplaylist"
										className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
									>
										<span className="text-foreground text-sm">
											Built for Modern IPTV Libraries
										</span>
										<span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

										<div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
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
								</AnimatedGroup>

								<TextEffect
									preset="fade-in-blur"
									speedSegment={0.3}
									as="h1"
									className="mx-auto mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]"
								>
									Your IPTV Library, Simplified
								</TextEffect>
								<TextEffect
									per="line"
									preset="fade-in-blur"
									speedSegment={0.3}
									delay={0.5}
									as="p"
									className="mx-auto mt-8 max-w-2xl text-balance text-lg"
								>
									Import playlists with Xtream Codes, M3U, or Stalker and enjoy
									a clean interface for live TV, movies, and series.
								</TextEffect>

								<AnimatedGroup
									variants={staggeredVariants}
									className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
								>
									<div
										key={1}
										className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5"
									>
										<Button
											size="lg"
											className="rounded-xl px-5 text-base"
											render={<Link href="/dashboard/addplaylist" />}
											nativeButton={false}
										>
											<span className="text-nowrap">Add a Playlist</span>
										</Button>
									</div>
									<Button
										key={2}
										size="lg"
										variant="secondary"
										className="h-10.5 rounded-xl px-5"
										render={<Link href="/" />}
										nativeButton={false}
									>
										<span className="text-nowrap">Browse Channels</span>
									</Button>
								</AnimatedGroup>
							</div>
						</div>

						<AnimatedGroup variants={staggeredVariants}>
							<div className="mask-b-from-55% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
								<div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
									<Image
										className="  aspect-15/8 relative hidden rounded-2xl dark:block"
										src="/dark_.webp"
										alt="app screen"
										loading="eager"
										width="2507"
										priority={true}
										height="1256"
									/>
									<Image
										className="aspect-15/8 relative rounded-2xl block dark:hidden"
										src="/light_.webp"
										alt="app screen"
										loading="eager"
										width="2507"
										height="1256"
									/>
								</div>
							</div>
						</AnimatedGroup>
					</div>
				</section>
			</main>
		</>
	);
}
