"use client";

import { useActionState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link2, Server } from "lucide-react";

const m3uSchema = z.object({
  m3uUrl: z
    .string()
    .min(1, "M3U URL is required")
    .url("Please enter a valid URL"),
  serverName: z.string().optional(),
});

type FormState = {
  errors: Record<string, string>;
  success: boolean;
};

function validate(_prev: FormState, formData: FormData): FormState {
  const result = m3uSchema.safeParse({
    m3uUrl: formData.get("m3uUrl"),
    serverName: formData.get("serverName") || undefined,
  });

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors, success: false };
  }

  console.log("M3U submitted:", result.data);
  return { errors: {}, success: true };
}

const initialState: FormState = { errors: {}, success: false };

export function M3UForm() {
  const [state, formAction, isPending] = useActionState(validate, initialState);

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
            placeholder="http://example.com/playlist.m3u"
            className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {state.errors.m3uUrl && (
          <p className="text-sm text-destructive">{state.errors.m3uUrl}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="m3u-serverName"
          className="text-sm font-medium text-foreground"
        >
          Server Name
        </Label>
        <div className="relative">
          <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="m3u-serverName"
            name="serverName"
            placeholder="My Server"
            className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Optional — give your server a friendly name.
        </p>
        {state.errors.serverName && (
          <p className="text-sm text-destructive">{state.errors.serverName}</p>
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
