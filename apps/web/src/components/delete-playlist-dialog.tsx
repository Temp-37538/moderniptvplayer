"use client";

import { deletePlaylistAction } from "@/server/forms";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export type DeletePlaylistDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	playlistId: string;
	playlistName: string;
	serverUrl: string;
};

export function DeletePlaylistDialog({
	open,
	onOpenChange,
	playlistId,
	playlistName,
	serverUrl,
}: DeletePlaylistDialogProps) {
	const router = useRouter();
	const [confirmation, setConfirmation] = useState("");
	const [isPending, setIsPending] = useState(false);
	const confirmationId = `confirm-playlist-name-${playlistId}`;
	const nameMatches =
		confirmation.trim().length > 0 &&
		confirmation.trim() === playlistName.trim();

	function handleOpenChange(next: boolean) {
		if (isPending) {
			return;
		}
		if (!next) {
			setConfirmation("");
		}
		onOpenChange(next);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!nameMatches || isPending) {
			return;
		}

		setIsPending(true);
		try {
			await deletePlaylistAction(playlistId);
			toast.success(`Playlist deleted: ${playlistName}`);
			setConfirmation("");
			onOpenChange(false);
			router.replace("/dashboard");
		} catch {
			toast.error("Unable to delete playlist");
		} finally {
			setIsPending(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete playlist ?</AlertDialogTitle>
						<AlertDialogDescription className="break-words">
							Permanently deletes "{playlistName}" ({serverUrl}) along with its
							favorites, watch later, and viewing progress. Cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<Field data-invalid={confirmation.length > 0 && !nameMatches}>
						<Label htmlFor={confirmationId}>
							Type{" "}
							<span className="font-medium text-foreground">
								{playlistName}
							</span>{" "}
							to confirm
						</Label>
						<Input
							id={confirmationId}
							name="confirmPlaylistName"
							value={confirmation}
							onChange={(event) => setConfirmation(event.target.value)}
							autoComplete="off"
							autoCapitalize="off"
							autoCorrect="off"
							spellCheck={false}
							disabled={isPending}
							placeholder="Playlist name"
							required
						/>
						{confirmation.length > 0 && !nameMatches ? (
							<FieldError>Type the playlist name exactly.</FieldError>
						) : null}
					</Field>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
						<Button
							type="submit"
							variant="destructive"
							disabled={!nameMatches || isPending || playlistId.length === 0}
						>
							{isPending ? <Spinner /> : null}
							Delete playlist
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
