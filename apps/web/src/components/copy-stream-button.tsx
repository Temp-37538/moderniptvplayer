"use client";

import type { CopyStreamButtonProps } from "@/components/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyStreamButton({ url }: CopyStreamButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        return true;
      }
    } catch {}

    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    setCopied(true);
    return true;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center size-8 rounded-[min(var(--radius-md),10px)] hover:bg-muted transition-colors"
            onClick={() => {
              handleCopy();
            }}
          >
            {copied ? (
              <ClipboardCheck className="size-4 transition-transform duration-150 scale-110" />
            ) : (
              <Clipboard className="size-4 transition-transform duration-150" />
            )}
          </button>
        }
      />
      <TooltipContent>
        <p>{copied ? "Copied" : "Copy link to read in another player"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
