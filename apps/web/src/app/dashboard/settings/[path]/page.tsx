import { Settings } from "@/components/auth/settings/settings";
import {
	SecuritySettingsSkeleton,
	SettingsSkeleton,
} from "@/components/skeletons";
import { getQueryClient } from "@/lib/query-client";
import { viewPaths } from "@better-auth-ui/core";
import { ensureSession } from "@better-auth-ui/react/server";
import { auth } from "@moderniptvplayer/auth";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

type Params = Promise<{
	path: string;
}>;

export default async function SettingsPage({ params }: { params: Params }) {
	const { path } = await params;
	const fallback =
		path === "security" ? <SecuritySettingsSkeleton /> : <SettingsSkeleton />;

	return (
		<Suspense fallback={fallback}>
			<div className="h-full overflow-y-auto no-scrollbar">
				<SettingsContent params={params} />
			</div>
		</Suspense>
	);
}

async function SettingsContent({ params }: { params: Params }) {
	const { path } = await params;
	if (!Object.values(viewPaths.settings).includes(path)) {
		notFound();
	}

	const requestHeaders = await headers();
	const queryClient = getQueryClient();

	const session = await ensureSession(queryClient, auth, {
		headers: requestHeaders,
	});

	if (!session) {
		redirect(
			`/auth/sign-in?redirectTo=${encodeURIComponent(`/dashboard/settings/${path}`)}`,
		);
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<div className="w-full  max-w-3xl mx-auto p-4 md:p-6">
				<Settings path={path} />
			</div>
		</HydrationBoundary>
	);
}
