"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground dark:hover:bg-sidebar-accent/50 dark:hover:text-foreground"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
		>
			<Sun className="size-4 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
