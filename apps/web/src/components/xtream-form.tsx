"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validate } from "@/server/forms";
import { cn } from "@/lib/utils";
import { CheckCircle2, Globe, ListVideo, Lock, User } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "./types";
import { Alert, AlertDescription } from "./ui/alert";

const initialState: FormState = {
	errors: {},
	message: "",
	success: false,
	inputs: { username: "", password: "", serverUrl: "", playlistName: "" },
};

export function XtreamCodesForm() {
	const [state, formAction, isPending] = useActionState(validate, initialState);
	const formKey = [
		state.inputs?.username ?? "",
		state.inputs?.password ?? "",
		state.inputs?.serverUrl ?? "",
		state.inputs?.playlistName ?? "",
		state.message,
		state.success ? "1" : "0",
	].join("|");

	return (
		<>
			<h1 className="text-4xl font-bold tracking-tighter py-2 px-4">
				Add Xtream Codes Playlist
			</h1>
			<form
				key={formKey}
				action={formAction}
				className="flex flex-col p-4 md:w-[50%] gap-5"
			>
				<div className="flex flex-col gap-2">
					<Label
						htmlFor="xtream-username"
						className="text-sm font-medium text-foreground"
					>
						Username
					</Label>
					<div className="relative">
						<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							id="xtream-username"
							name="username"
							required
							defaultValue={state.inputs?.username ?? ""}
							minLength={1}
							maxLength={40}
							autoComplete="username"
							aria-describedby="username-error"
							placeholder="Enter your username"
							className={cn(
								"pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground",
								{
									"border-destructive": state.errors.properties?.username,
								},
							)}
						/>
					</div>
					{state.errors.properties?.username && (
						<p className="text-sm text-destructive">
							{state.errors.properties.username.errors.join(", ")}
						</p>
					)}
				</div>

				<div className="flex flex-col gap-2">
					<Label
						htmlFor="xtream-password"
						className="text-sm font-medium text-foreground"
					>
						Password
					</Label>
					<div className="relative">
						<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							id="xtream-password"
							name="password"
							defaultValue={state.inputs?.password ?? ""}
							required
							minLength={1}
							maxLength={100}
							autoComplete="current-password"
							aria-describedby="password-error"
							type="password"
							placeholder="Enter your password"
							className={cn(
								"pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground",
								{
									"border-destructive": state.errors.properties?.password,
								},
							)}
						/>
					</div>
					{state.errors.properties?.password && (
						<p className="text-sm text-destructive">
							{state.errors.properties.password.errors.join(", ")}
						</p>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<Label
						htmlFor="xtream-serverUrl"
						className="text-sm font-medium text-foreground"
					>
						Server URL
					</Label>
					<div className="relative">
						<Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							id="xtream-serverUrl"
							name="serverUrl"
							required
							autoComplete="url"
							defaultValue={state.inputs?.serverUrl ?? ""}
							aria-describedby="serverUrl-error"
							placeholder="http://example.com:8080"
							className={cn(
								"pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground",
								{
									"border-destructive": state.errors.properties?.serverUrl,
								},
							)}
						/>
					</div>
					{state.errors.properties?.serverUrl && (
						<p className="text-sm text-destructive">
							{state.errors.properties.serverUrl.errors.join(", ")}
						</p>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<Label
						htmlFor="xtream-playlistName"
						className="text-sm font-medium text-foreground"
					>
						Playlist Name
					</Label>
					<div className="relative">
						<ListVideo className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							id="xtream-playlistName"
							name="playlistName"
							required
							minLength={1}
							maxLength={50}
							autoComplete="playlist-name"
							defaultValue={state.inputs?.playlistName ?? ""}
							aria-describedby="playlistName-error"
							placeholder="My Playlist"
							className={cn(
								"pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground",
								{
									"border-destructive": state.errors.properties?.playlistName,
								},
							)}
						/>
					</div>
					{state.errors.properties?.playlistName && (
						<p className="text-sm text-destructive">
							{state.errors.properties.playlistName.errors.join(", ")}
						</p>
					)}
				</div>
				<Button
					type="submit"
					disabled={isPending}
					className="h-12 w-full mt-2 text-base font-semibold"
				>
					{isPending ? "Adding..." : "Add Playlist"}
				</Button>

				{state?.message && (
					<Alert variant={state.success ? "default" : "destructive"}>
						{state.success && (
							<CheckCircle2 color="green" className="h-4 w-4" />
						)}
						<AlertDescription
							className={cn(state.success ? "text-green-500" : "text-red-500")}
						>
							{state.message}
						</AlertDescription>
					</Alert>
				)}
			</form>
		</>
	);
}
