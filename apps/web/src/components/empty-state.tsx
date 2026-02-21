import type { EmptyStateProps } from "@/components/types";
import { PackageOpen } from "lucide-react";

export function EmptyState({ icon, title, description }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
			{icon ?? <PackageOpen className="size-12 mb-4 opacity-30" />}
			<p className="text-lg font-medium">{title}</p>
			{description && <p className="text-sm">{description}</p>}
		</div>
	);
}
