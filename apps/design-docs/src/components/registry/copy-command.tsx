"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyCommandProps {
  command: string;
  className?: string;
}

/**
 * Copy-to-clipboard button for shadcn install commands.
 *
 * Renders the command in a code-style chip with a copy icon that flips
 * to a checkmark for 1.5s after a successful copy.
 */
export function CopyCommand({ command, className = "" }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      // Clipboard API unavailable (e.g., insecure context). Fail silently —
      // the user can still select the rendered command manually.
      console.error("Clipboard write failed", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Command copied" : "Copy install command"}
      className={`group flex w-full items-center justify-between gap-3 rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-3 py-2 font-mono text-xs text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)] ${className}`}
    >
      <span className="truncate">{command}</span>
      {copied ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
      )}
    </button>
  );
}
