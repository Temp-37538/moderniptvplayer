"use client";
import { authClient } from "@/lib/auth-client";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import type { Route } from "next";
import Link from "next/link";
import { ThemeProvider } from "./theme-provider";
import { SidebarProvider } from "./ui/sidebar";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";
import { useRouter } from "next/navigation";

type AuthLinkProps = {
	href: string;
	className?: string;
	children: React.ReactNode;
};

function AuthLink({ href, className, children }: AuthLinkProps) {
	return (
		<Link href={href as Route} className={className}>
			{children}
		</Link>
	);
}

export default function Providers({ children }: { children: React.ReactNode }) {
	const router = useRouter();

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<SidebarProvider>
				<TooltipProvider>
					<AuthUIProvider
						authClient={authClient}
						navigate={(href) => router.push(href as Route)}
						replace={(href) => router.replace(href as Route)}
						onSessionChange={() => {
							router.refresh();
						}}
						account={{
							basePath: "/dashboard/account",
						}}
						nameRequired={false}
						redirectTo="/dashboard/auth/sign-in"
						changeEmail={false}
						signUp={{ fields: [] }}
						Link={AuthLink}
						deleteUser={true}
						credentials={{ confirmPassword: true, forgotPassword: false }}
					>
						{children}
					</AuthUIProvider>
				</TooltipProvider>
			</SidebarProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
