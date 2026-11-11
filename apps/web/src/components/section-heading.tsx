import type { ReactNode } from "react";

/** Serif section title for the home page, with an optional action. */
export function SectionHeading({
	id,
	title,
	description,
	action,
}: {
	id: string;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
			<div>
				<h2 id={id} className="font-serif text-2xl tracking-tight">
					{title}
				</h2>
				{description ? (
					<p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
			{action}
		</div>
	);
}
