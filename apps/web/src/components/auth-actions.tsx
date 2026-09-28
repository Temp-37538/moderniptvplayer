"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

export function AuthActions() {
	return (
		<div className="absolute top-4 left-4 z-20 flex items-center gap-2">
			<Link
				href="/"
				className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-input bg-background/80 px-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
			>
				<ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
				Home
			</Link>
			<ModeToggle />
		</div>
	);
}
