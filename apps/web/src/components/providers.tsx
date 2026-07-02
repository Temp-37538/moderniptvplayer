"use client";
import { authClient } from "@/lib/auth-client";
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin";
import { getQueryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthProvider } from "./auth/auth-provider";
import { ThemeProvider } from "./theme-provider";
import { SidebarProvider } from "./ui/sidebar";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

function AuthProviderWithRedirect({
	children,
	router,
}: {
	children: React.ReactNode;
	router: ReturnType<typeof useRouter>;
}) {
	const searchParams = useSearchParams();
	const rawRedirectTo =
		searchParams.get("redirectTo") || searchParams.get("redirect");
	const safeRedirectTo =
		rawRedirectTo?.startsWith("/") && !rawRedirectTo.startsWith("//")
			? rawRedirectTo
			: "/dashboard";

	return (
		<AuthProvider
			authClient={authClient}
			basePaths={{ settings: "/dashboard/settings" }}
			emailAndPassword={{
				enabled: true,
				forgotPassword: false,
				name: false,
				confirmPassword: true,
			}}
			redirectTo={safeRedirectTo}
			socialProviders={[]}
			navigate={({ to, replace }) => {
				const dest = to as string;
				const isSafe = dest.startsWith("/") && !dest.startsWith("//");

				if (!isSafe) {
					window.location.href = "/dashboard";
					return;
				}

				if (dest.startsWith("/auth")) {
					return replace
						? router.replace(dest as never)
						: router.push(dest as never);
				}
				if (replace) {
					window.location.replace(dest);
				} else {
					window.location.href = dest;
				}
			}}
			plugins={[deleteUserPlugin()]}
			Link={Link as never}
		>
			{children}
			<Toaster richColors />
		</AuthProvider>
	);
}

export default function Providers({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const queryClient = getQueryClient();

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
		>
			<SidebarProvider>
				<TooltipProvider>
					<QueryClientProvider client={queryClient}>
						<Suspense fallback={null}>
							<AuthProviderWithRedirect router={router}>
								{children}
							</AuthProviderWithRedirect>
						</Suspense>
					</QueryClientProvider>
				</TooltipProvider>
			</SidebarProvider>
		</ThemeProvider>
	);
}
