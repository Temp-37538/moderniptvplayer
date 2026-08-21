"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, TvMinimal, X } from "lucide-react";
import Link from "next/link";
import React from "react";

const menuItems: Array<{ name: string; id: number; href: string }> = [
	{ name: "Add Playlist", id: 1, href: "/dashboard/addplaylist" },
	{ name: "Xtream Codes", id: 2, href: "/dashboard/addplaylist/xtream" },
	{ name: "M3U URL", id: 3, href: "/dashboard/addplaylist/m3u" },
];

export const HeroHeader = () => {
	const [menuState, setMenuState] = React.useState(false);
	const [isScrolled, setIsScrolled] = React.useState(false);

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);
	return (
		<header>
			<nav
				data-state={menuState && "active"}
				className="fixed z-111 w-full px-2"
			>
				<div
					className={cn(
						"mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
						isScrolled &&
							"bg-[oklch(0.11_0.012_32)]/50 max-w-4xl rounded-2xl border border-[oklch(0.29_0.015_32)] backdrop-blur-lg lg:px-5",
					)}
				>
					<div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
						<div className="flex w-full justify-between lg:w-auto">
							<Link
								href="/"
								aria-label="home"
								className="flex items-center space-x-2 text-[oklch(0.92_0.025_60)]"
							>
								<TvMinimal className="size-6" />
							</Link>

							<button
								type="button"
								onClick={() => setMenuState(!menuState)}
								aria-label={menuState === true ? "Close Menu" : "Open Menu"}
								className="relative z-111 -m-2.5 -mr-4 block cursor-pointer p-2.5 text-[oklch(0.92_0.025_60)] lg:hidden"
							>
								<Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
								<X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
							</button>
						</div>

						<div className="absolute inset-0  m-auto hidden size-fit lg:block">
							<ul className="flex gap-8 text-sm">
								{menuItems.map((item) => (
									<li key={item.id}>
										<Link
											href={item.href as never}
											className=" text-[oklch(0.92_0.025_60)] hover:text-[oklch(0.71_0.022_58)] block duration-150"
										>
											<span>{item.name}</span>
										</Link>
									</li>
								))}
							</ul>
						</div>

						<div className="bg-[oklch(0.215_0.014_32)]/60 backdrop-blur-xl in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-[oklch(0.29_0.015_32)] p-6 shadow-none md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:backdrop-blur-none lg:p-0">
							<div className="lg:hidden">
								<ul className="space-y-6 text-base">
									{menuItems.map((item) => (
										<li key={item.id}>
											<Link
												href={item.href as never}
												className="text-[oklch(0.71_0.022_58)] hover:text-[oklch(0.92_0.025_60)] block duration-150"
											>
												<span>{item.name}</span>
											</Link>
										</li>
									))}
								</ul>
							</div>
							<div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
								<Button
									size="sm"
									className={cn(
										"border border-[oklch(0.215_0.014_32)] bg-[oklch(0.215_0.014_32)]/30 text-[oklch(0.92_0.025_60)] shadow-[0rem_0.5rem_1rem_0rem_hsl(20_35%_2%/0.2)] hover:bg-[oklch(0.215_0.014_32)]/50 hover:text-[oklch(0.92_0.025_60)] aria-expanded:bg-[oklch(0.215_0.014_32)] aria-expanded:text-[oklch(0.92_0.025_60)]",
										isScrolled && "lg:hidden",
									)}
									render={<Link href="/auth/sign-in" />}
									nativeButton={false}
								>
									<span>Sign In</span>
								</Button>
								<Button
									size="sm"
									className={cn(
										"bg-[oklch(0.76_0.15_47)] text-[oklch(0.14_0.012_32)] hover:bg-[oklch(0.76_0.15_47)]/90",
										isScrolled && "lg:hidden",
									)}
									render={<Link href="/auth/sign-up" />}
									nativeButton={false}
								>
									<span>Create Account</span>
								</Button>
								<Button
									size="sm"
									className={cn(
										"bg-[oklch(0.76_0.15_47)] text-[oklch(0.14_0.012_32)] hover:bg-[oklch(0.76_0.15_47)]/90",
										isScrolled ? "lg:inline-flex" : "hidden",
									)}
									render={<Link href="/dashboard/addplaylist" />}
									nativeButton={false}
								>
									<span>Add Playlist</span>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
};
