"use client";

import type { SimpleFormState } from "@/components/types";
import { useActionState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Globe, Fingerprint } from "lucide-react";

const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

const stalkerPortalSchema = z.object({
	portalUrl: z
		.string()
		.min(1, "Portal URL is required")
		.url("Please enter a valid URL"),
	macAddress: z
		.string()
		.min(1, "MAC address is required")
		.regex(
			macAddressRegex,
			"Please enter a valid MAC address (e.g. 00:1A:2B:3C:4D:5E)",
		),
});

function validate(_prev: SimpleFormState, formData: FormData): SimpleFormState {
	const result = stalkerPortalSchema.safeParse({
		portalUrl: formData.get("portalUrl"),
		macAddress: formData.get("macAddress"),
	});

	if (!result.success) {
		const errors: Record<string, string> = {};
		for (const issue of result.error.issues) {
			const key = issue.path[0] as string;
			if (!errors[key]) errors[key] = issue.message;
		}
		return { errors, success: false };
	}

	return { errors: {}, success: true };
}

const initialState: SimpleFormState = { errors: {}, success: false };

export function StalkerPortalForm() {
	const [state, formAction, isPending] = useActionState(validate, initialState);

	return (
		<form action={formAction} className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<Label
					htmlFor="stalker-portalUrl"
					className="text-sm font-medium text-foreground"
				>
					Portal URL
				</Label>
				<div className="relative">
					<Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						id="stalker-portalUrl"
						name="portalUrl"
						placeholder="http://portal.example.com/c/"
						className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				{state.errors.portalUrl && (
					<p className="text-sm text-destructive">{state.errors.portalUrl}</p>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<Label
					htmlFor="stalker-macAddress"
					className="text-sm font-medium text-foreground"
				>
					MAC Address
				</Label>
				<div className="relative">
					<Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						id="stalker-macAddress"
						name="macAddress"
						placeholder="00:1A:2B:3C:4D:5E"
						className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				{state.errors.macAddress && (
					<p className="text-sm text-destructive">{state.errors.macAddress}</p>
				)}
			</div>

			<Button
				type="submit"
				disabled={isPending}
				className="h-12 w-full mt-2 text-base font-semibold"
			>
				{isPending ? "Adding..." : "Add Playlist"}
			</Button>

			{state.success && (
				<p className="text-sm text-center text-muted-foreground">
					Playlist added successfully.
				</p>
			)}
		</form>
	);
}
