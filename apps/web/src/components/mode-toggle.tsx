"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ModeToggle() {
	const { setTheme } = useTheme();
	const [isRotating, setIsRotating] = useState(false);

	useEffect(() => {
		if (!isRotating) return;
		const timeout = window.setTimeout(() => setIsRotating(false), 300);
		return () => window.clearTimeout(timeout);
	}, [isRotating]);

	return (
		<Button
			variant="ghost"
			size="icon"
			className={`relative size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground dark:hover:bg-sidebar-accent/50 dark:hover:text-foreground transition-transform duration-300 ease-out ${
				isRotating ? "rotate-[360deg]" : "rotate-0"
			}`}
			onClick={() => {
				setTheme(
					document.documentElement.classList.contains("dark")
						? "light"
						: "dark",
				);
				setIsRotating(true);
			}}
		>
			<Sun className="size-4 scale-100 rotate-0 transition-all duration-300 delay-150 dark:-rotate-90 dark:scale-0 dark:delay-0" />
			<Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-300 delay-0 dark:rotate-0 dark:scale-100 dark:delay-150" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}