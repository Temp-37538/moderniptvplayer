"use client";

import type { M3uFormState } from "@/components/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addM3uPlaylistAction } from "@/server/forms";
import { cn } from "@/lib/utils";
import { CheckCircle2, Link2, ListVideo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

const initialState: M3uFormState = {
	errors: {},
	success: false,
	inputs: { m3uUrl: "", playlistName: "" },
};

export function M3UForm() {
	const router = useRouter();
	const [state, formAction, isPending] = useActionState(
		async (previous: M3uFormState, formData: FormData) => {
			const result = await addM3uPlaylistAction(previous, formData);
			if (result.success && result.playlistId) {
				router.push(`/dashboard/${result.playlistId}`);
				router.refresh();
			}
			return result;
		},
		initialState,
	);
	const inputs = state.inputs ?? initialState.inputs;

	return (
		<form action={formAction} className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<Label
					htmlFor="m3u-url"
					className="text-sm font-medium text-foreground"
				>
					M3U URL
				</Label>
				<div className="relative">
					<Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						id="m3u-url"
						name="m3uUrl"
						required
						maxLength={4096}
						defaultValue={inputs?.m3uUrl ?? ""}
						placeholder="http://example.com/playlist.m3u"
						autoComplete="off"
						className={cn(
							"pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground",
							{ "border-destructive": state.errors.m3uUrl },
						)}
					/>
				</div>
				{state.errors.m3uUrl ? (
					<p className="text-sm text-destructive">{state.errors.m3uUrl}</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<Label
					htmlFor="m3u-playlist-name"
					className="text-sm font-medium text-foreground"
				>
					Playlist name
				</Label>
				<div className="relative">
					<ListVideo className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						id="m3u-playlist-name"
						name="playlistName"
						maxLength={100}
						defaultValue={inputs?.playlistName ?? ""}
						placeholder="My Playlist"
						autoComplete="off"
						className={cn(
							"pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground",
							{ "border-destructive": state.errors.playlistName },
						)}
					/>
				</div>
				<p className="text-sm text-muted-foreground">
					Optional. If you leave it blank, the host name is used.
				</p>
				{state.errors.playlistName ? (
					<p className="text-sm text-destructive">
						{state.errors.playlistName}
					</p>
				) : null}
			</div>

			<Button
				type="submit"
				disabled={isPending}
				className="h-12 w-full mt-2 text-base font-semibold"
			>
				{isPending ? "Adding..." : "Add Playlist"}
			</Button>

			{state.message ? (
				<Alert variant={state.success ? "default" : "destructive"}>
					{state.success ? (
						<CheckCircle2 color="green" className="size-4" />
					) : null}
					<AlertDescription
						className={cn(state.success ? "text-green-500" : "text-red-500")}
					>
						{state.message}
					</AlertDescription>
				</Alert>
			) : null}
		</form>
	);
}
