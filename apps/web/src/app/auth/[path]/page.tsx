import { getAuthPageMetadata } from "@/app/metadata";
import { Auth } from "@/components/auth/auth";
import { viewPaths } from "@better-auth-ui/core";
import { Tv } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthActions } from "../../../components/auth-actions";
import { AuthSuspense } from "../../../components/skeletons";
import { HeroOverlayV2 } from "../../../components/hero-overlay";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ path: string }>;
}): Promise<Metadata> {
	const { path } = await params;
	return getAuthPageMetadata(path);
}

export default async function AuthPage({
	params,
}: {
	params: Promise<{ path: string }>;
}) {
	const { path } = await params;
	
	if (!Object.values(viewPaths.auth).includes(path)) {
		notFound();
	}
	return (
		<div className="flex w-full justify-center items-center relative">
			<AuthActions />
			<div className="flex w-full z-10 flex-col gap-4 p-6 md:p-10">
				<div className="flex w-full justify-center gap-2  ">
					<a href="/" className="flex   items-center gap-2 font-medium">
						<div className=" bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
							<Tv className="size-4" />
						</div>
						Modern Player
					</a>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<Suspense fallback={<AuthSuspense path={path} />}>
							<AuthCard path={path} />
						</Suspense>
					</div>
				</div>
			</div>
			<div className="bg-muted w-full z-0 md:z-10 h-full absolute md:relative lg:block overflow-hidden">
				<HeroOverlayV2 />
				<div className="absolute inset-0 z-5 bg-linear-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
				<Image
					alt="Background"
					src="/background.webp"
					fill
					sizes="(min-width: 768px) 50vw, 100vw"
					className="object-cover dark:brightness-[0.6] grayscale"
					loading="eager"
					fetchPriority="high"
				/>
			</div>
		</div>
	);
}

async function AuthCard({ path }: { path: string }) {
	return (
		<Auth socialPosition={undefined} className="bg-background/90" path={path} />
	);
}
