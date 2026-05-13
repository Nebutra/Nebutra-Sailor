"use client";

import { Check, Copy } from "@nebutra/icons";
import { useState } from "react";

interface HeroInstallPillProps {
  command: string;
  copiedLabel: string;
}

/**
 * Compact one-click-to-copy CLI pill — Flowith-style.
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
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-black/5 bg-white/60 py-1 pl-3 pr-1 text-xs font-medium shadow-sm backdrop-blur-xl transition-all hover:bg-white/75 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12">
      <code className="font-mono text-[12px] tracking-tight text-zinc-700 dark:text-zinc-200">
        <span className="select-none text-zinc-400 dark:text-zinc-500">$ </span>
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? copiedLabel : `Copy: ${command}`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

HeroInstallPill.displayName = "HeroInstallPill";
