"use client";

import { useAuth, useSession } from "@better-auth-ui/react";
import type { User } from "better-auth";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";

export type UserViewProps = {
	className?: string;
	isPending?: boolean;
	/**
	 * When true, the subtitle line (email when the name is shown) is hidden.
	 * @default false
	 */
	hideSubtitle?: boolean;
	/** @remarks `User` */
	user?: Partial<User>;
};
export function UserView({
	className,
	isPending,
	hideSubtitle = false,
	user,
}: UserViewProps) {
	const { authClient } = useAuth();
	const { data: session, isPending: sessionPending } = useSession(authClient, {
		enabled: !user && !isPending,
	});

	const resolvedUser = user ?? session?.user;

	if ((isPending || sessionPending) && !user) {
		return (
			<div className={cn("flex items-center gap-2 min-w-0", className)}>
				<UserAvatar isPending />

				<div className="grid flex-1 gap-1 text-left text-sm">
					<Skeleton className="h-4 w-24" />

					{!hideSubtitle && <Skeleton className="h-3 w-32" />}
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-2 min-w-0", className)}>
			<UserAvatar user={resolvedUser} />

			<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
				<span className="truncate font-medium text-foreground">
					{resolvedUser?.name || resolvedUser?.email}
				</span>

				{!hideSubtitle && resolvedUser?.name && (
					<span className="text-muted-foreground truncate text-xs">
						{resolvedUser?.email}
					</span>
				)}
			</div>
		</div>
	);
}
