"use client";

import type { FormState } from "@/components/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { updatePlaylistAction } from "@/server/forms";
import { CheckCircle2, Globe, ListVideo, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

export type EditablePlaylist = {
	id: string;
	playlistName: string;
	serverUrl: string;
	username: string;
};

type EditPlaylistSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	playlist: EditablePlaylist | null;
	fieldIdPrefix: string;
};

const emptyInputs = {
	username: "",
	password: "",
	serverUrl: "",
	playlistName: "",
};

export function EditPlaylistSheet({
	open,
	onOpenChange,
	playlist,
	fieldIdPrefix,
}: EditPlaylistSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader className="pr-10">
					<SheetTitle>Edit playlist</SheetTitle>
					<SheetDescription>
						Update the name, server, username, or password.{" "}
						<strong>
							Favorites, watch later, and viewing progress stay attached to this
							playlist even if the provider changes.
						</strong>{" "}
						Leave the password blank to keep the current one.
					</SheetDescription>
				</SheetHeader>
				{open && playlist ? (
					<EditPlaylistForm
						key={playlist.id}
						playlist={playlist}
						fieldIdPrefix={fieldIdPrefix}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function EditPlaylistForm({
	playlist,
	fieldIdPrefix,
}: {
	playlist: EditablePlaylist;
	fieldIdPrefix: string;
}) {
	const router = useRouter();
	const initialState: FormState = {
		errors: {},
		message: "",
		success: false,
		inputs: {
			username: playlist.username,
			password: "",
			serverUrl: playlist.serverUrl,
			playlistName: playlist.playlistName,
		},
	};
	const [state, formAction, isPending] = useActionState(
		async (previous: FormState, formData: FormData) => {
			const result = await updatePlaylistAction(previous, formData);
			if (result.success) {
				router.refresh();
			}
			return result;
		},
		initialState,
	);
	const inputs = state.inputs ?? emptyInputs;
	const formKey = [
		inputs.username,
		inputs.password,
		inputs.serverUrl,
		inputs.playlistName,
		state.message,
		state.success ? "1" : "0",
	].join("|");
	const usernameId = `${fieldIdPrefix}-username`;
	const passwordId = `${fieldIdPrefix}-password`;
	const serverUrlId = `${fieldIdPrefix}-server-url`;
	const playlistNameId = `${fieldIdPrefix}-name`;

	return (
		<form
			key={formKey}
			action={formAction}
			autoComplete="off"
			className="flex flex-col gap-4 px-4 pb-4"
		>
			<input type="hidden" name="playlistId" value={playlist.id} />

			<div className="flex flex-col gap-2">
				<Label htmlFor={playlistNameId}>Playlist name</Label>
				<div className="relative">
					<ListVideo className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={playlistNameId}
						name="playlistName"
						required
						minLength={1}
						maxLength={100}
						defaultValue={inputs.playlistName}
						autoComplete="off"
						placeholder="My Playlist"
						className={cn("h-10 pl-10", {
							"border-destructive": state.errors.properties?.playlistName,
						})}
					/>
				</div>
				{state.errors.properties?.playlistName ? (
					<p className="text-sm text-destructive">
						{state.errors.properties.playlistName.errors.join(", ")}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={serverUrlId}>Server URL</Label>
				<div className="relative">
					<Globe className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={serverUrlId}
						name="serverUrl"
						required
						maxLength={2048}
						defaultValue={inputs.serverUrl}
						autoComplete="off"
						placeholder="http://example.com:8080"
						className={cn("h-10 pl-10", {
							"border-destructive": state.errors.properties?.serverUrl,
						})}
					/>
				</div>
				{state.errors.properties?.serverUrl ? (
					<p className="text-sm text-destructive">
						{state.errors.properties.serverUrl.errors.join(", ")}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={usernameId}>Username</Label>
				<div className="relative">
					<User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={usernameId}
						name="username"
						required
						minLength={1}
						maxLength={128}
						defaultValue={inputs.username}
						autoComplete="off"
						placeholder="Enter your username"
						className={cn("h-10 pl-10", {
							"border-destructive": state.errors.properties?.username,
						})}
					/>
				</div>
				{state.errors.properties?.username ? (
					<p className="text-sm text-destructive">
						{state.errors.properties.username.errors.join(", ")}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={passwordId}>Password</Label>
				<div className="relative">
					<Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={passwordId}
						name="password"
						type="password"
						maxLength={256}
						defaultValue={inputs.password}
						autoComplete="new-password"
						placeholder="Leave blank to keep the current password"
						className={cn("h-10 pl-10", {
							"border-destructive": state.errors.properties?.password,
						})}
					/>
				</div>
				<p className="text-sm text-muted-foreground">
					Leave blank to keep the current password.
				</p>
				{state.errors.properties?.password ? (
					<p className="text-sm text-destructive">
						{state.errors.properties.password.errors.join(", ")}
					</p>
				) : null}
			</div>

			<Button type="submit" disabled={isPending} className="mt-2">
				{isPending ? "Saving..." : "Save changes"}
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
