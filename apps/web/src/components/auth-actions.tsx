"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

export function AuthActions() {
	return (
		<div className="absolute top-4 left-4 z-20 flex items-center gap-2">
			<Link
				href="/"
				className="inline-flex items-center gap-2 rounded-md border border-input bg-background/80 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
			>
				<ArrowLeft className="size-3.5" />
				Home
			</Link>
			<ModeToggle />
		</div>
	);
}
