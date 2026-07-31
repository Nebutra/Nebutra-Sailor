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
 *
 * Surfaces come from the neutral scale, which already flips with the theme.
 * This previously used `bg-white/60` with no dark counterpart, so over the dark
 * hero it composited into a flat grey slab while only the *text* had a `dark:`
 * variant. There is no border: the tonal step off the background separates it,
 * plus one step of the ambient shadow ramp — in light mode the hero is nearly
 * the same value as neutral-3, so tone alone left the chip floating flat.
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
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-neutral-3 py-1 pr-1 pl-4 text-xs font-medium shadow-ambient-sm transition-colors hover:bg-neutral-4">
      <code className="font-mono text-[12px] tracking-tight text-neutral-12">
        <span className="select-none text-neutral-10">$ </span>
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? copiedLabel : `Copy: ${command}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-neutral-11 transition-colors hover:bg-neutral-5 hover:text-neutral-12"
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
