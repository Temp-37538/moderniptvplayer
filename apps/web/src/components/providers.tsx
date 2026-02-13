"use client";
import { authClient } from "@/lib/auth-client";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { ThemeProvider } from "./theme-provider";
import { SidebarProvider } from "./ui/sidebar";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";
import { useRouter } from "next/navigation";

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
            navigate={router.push}
            replace={router.replace}
            onSessionChange={() => {
              router.refresh();
            }}
            nameRequired={false}
            changeEmail={false}
            signUp={{ fields: [] }}
            Link={Link}
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
