"use client";

import type { ExternalStreamLinkProps } from "@/components/types";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExternalLink } from "lucide-react";

// This has to stay a client component: passing a host element through the base-ui
// `render` prop from a server component breaks SSR, the serialized element reaches
// `useRender` with an unresolved type.
export function ExternalStreamLink({ href, label }: ExternalStreamLinkProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={label}
						className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors"
					>
						<ExternalLink className="size-4" />
					</a>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
