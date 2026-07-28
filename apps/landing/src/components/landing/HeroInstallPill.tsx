"use client";

import { Check, Copy } from "@nebutra/icons";
import { useState } from "react";

interface HeroInstallPillProps {
  command: string;
  copiedLabel: string;
}

/**
 * Compact one-click-to-copy CLI pill.
 *
 * Renders a single rounded-full pill: monospace command on the left,
 * copy-icon button on the right. Clicking the icon copies the command
 * to clipboard and swaps to a check mark for ~1.6s.
 */
export function HeroInstallPill({ command, copiedLabel }: HeroInstallPillProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard API can fail in sandboxed contexts; silently no-op
    }
  };

  return (
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-black/5 bg-white/60 py-1 pr-1 pl-4 text-xs font-medium shadow-sm transition-colors hover:bg-white/75">
      <code className="font-mono text-[12px] tracking-tight text-zinc-700 dark:text-zinc-200">
        <span className="select-none text-zinc-400 dark:text-zinc-500">$ </span>
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? copiedLabel : `Copy: ${command}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400"
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

HeroInstallPill.displayName = "HeroInstallPill";
