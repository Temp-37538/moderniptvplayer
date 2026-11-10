"use client";

import type { FormState, M3uFormState } from "@/components/types";
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
import { isM3uSource } from "@/lib/playlist-label";
import { updateM3uPlaylistAction, updatePlaylistAction } from "@/server/forms";
import { CheckCircle2, Globe, ListVideo, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionState } from "react";

export type EditablePlaylist = {
	id: string;
	source: "XTREAM" | "M3U";
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
	const [notice, setNotice] = useState<{
		message: string;
		success: boolean;
	} | null>(null);

	const handleOpenChange = (next: boolean) => {
		if (!next) setNotice(null);
		onOpenChange(next);
	};

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
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
					isM3uSource(playlist.source) ? (
						<EditM3uPlaylistForm
							key={playlist.id}
							playlist={playlist}
							fieldIdPrefix={fieldIdPrefix}
							onNotice={(message, success) => setNotice({ message, success })}
						/>
					) : (
						<EditPlaylistForm
							key={playlist.id}
							playlist={playlist}
							fieldIdPrefix={fieldIdPrefix}
						/>
					)
				) : null}
				{notice ? (
					<div className="px-4 pb-4">
						<Alert variant={notice.success ? "default" : "destructive"}>
							{notice.success ? (
								<CheckCircle2 color="green" className="size-4" />
							) : null}
							<AlertDescription
								className={cn(
									notice.success ? "text-green-500" : "text-red-500",
								)}
							>
								{notice.message}
							</AlertDescription>
						</Alert>
					</div>
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
			if (result.success && result.changed !== false) {
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

function EditM3uPlaylistForm({
	playlist,
	fieldIdPrefix,
	onNotice,
}: {
	playlist: EditablePlaylist;
	fieldIdPrefix: string;
	onNotice?: (message: string, success: boolean) => void;
}) {
	const router = useRouter();
	const initialState: M3uFormState = {
		errors: {},
		message: "",
		success: false,
		inputs: { m3uUrl: "", playlistName: playlist.playlistName },
	};
	const [state, formAction, isPending] = useActionState(
		async (previous: M3uFormState, formData: FormData) => {
			const result = await updateM3uPlaylistAction(previous, formData);
			if (result.success && result.changed !== false) {
				router.refresh();
			}
			if (result.success && result.convertedToXtream && result.message) {
				onNotice?.(result.message, true);
			}
			return result;
		},
		initialState,
	);
	const inputs = state.inputs ?? {
		m3uUrl: "",
		playlistName: playlist.playlistName,
	};
	const formKey = [
		inputs.m3uUrl,
		inputs.playlistName,
		state.message,
		state.success ? "1" : "0",
	].join("|");
	const playlistNameId = `${fieldIdPrefix}-name`;
	const urlId = `${fieldIdPrefix}-m3u-url`;

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
							"border-destructive": state.errors.playlistName,
						})}
					/>
				</div>
				<p className="text-sm text-muted-foreground">
					Current host: {playlist.serverUrl}
				</p>
				{state.errors.playlistName ? (
					<p className="text-sm text-destructive">
						{state.errors.playlistName}
					</p>
				) : null}
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor={urlId}>M3U URL</Label>
				<div className="relative">
					<Globe className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={urlId}
						name="m3uUrl"
						type="text"
						inputMode="url"
						maxLength={4096}
						defaultValue={inputs.m3uUrl}
						autoComplete="off"
						placeholder="Leave blank to keep the current URL"
						className={cn("h-10 pl-10", {
							"border-destructive": state.errors.m3uUrl,
						})}
					/>
				</div>
				<p className="text-sm text-muted-foreground">
					Leave blank to keep the current URL. A new URL is checked before it
					replaces the saved one.
				</p>
				{state.errors.m3uUrl ? (
					<p className="text-sm text-destructive">{state.errors.m3uUrl}</p>
				) : null}
			</div>
			<Button type="submit" disabled={isPending} className="mt-2">
				{isPending ? "Saving..." : "Save changes"}
			</Button>
			{state.message && !state.convertedToXtream ? (
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
