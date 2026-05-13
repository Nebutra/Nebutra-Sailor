"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ACCENT_ICON_CLASSES, useCommandMode } from "./command-mode-context";
import { useCommandPalette } from "./command-palette-provider";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => void;
};

function supportsViewTransitions() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return typeof (document as DocumentWithViewTransition).startViewTransition === "function";
}

export function CommandSurfaceButton() {
  const { toggle } = useCommandPalette();
  const { currentMeta } = useCommandMode();
  const router = useRouter();
  const ModeIcon = currentMeta.icon;
  const iconColor = ACCENT_ICON_CLASSES[currentMeta.accent];
  const isPaletteMode = currentMeta.destination === "palette";

  const handleClick = () => {
    if (isPaletteMode) {
      toggle();
      return;
    }
    const dest = currentMeta.destination;
    if (supportsViewTransitions()) {
      const doc = document as DocumentWithViewTransition;
      doc.startViewTransition?.(() => router.push(dest));
    } else {
      router.push(dest);
    }
  };

  const ariaLabel = isPaletteMode
    ? `Open command palette: ${currentMeta.placeholder}`
    : `Open ${currentMeta.label}: ${currentMeta.placeholder}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      data-tour-id="command-surface"
      className="group flex w-full items-center gap-3 rounded-2xl border border-neutral-7 bg-neutral-1 px-5 py-4 text-left transition-all duration-200 hover:border-neutral-9 hover:shadow-[0_0_0_3px_var(--blue-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-8 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <Sparkles className="h-4 w-4 text-blue-9 transition-opacity duration-200 group-hover:opacity-0" />
        <ModeIcon
          className={`absolute h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${iconColor}`}
        />
      </span>
      <span className="flex-1 truncate text-sm text-neutral-10 transition-colors group-hover:text-neutral-11 dark:text-white/40 dark:group-hover:text-white/60">
        {currentMeta.placeholder}
      </span>
      <kbd className="hidden shrink-0 rounded border border-neutral-6 bg-neutral-2 px-1.5 py-0.5 font-mono text-[10px] text-neutral-10 transition-colors group-hover:border-neutral-8 group-hover:bg-neutral-3 dark:border-white/10 dark:bg-white/5 dark:text-white/40 sm:block">
        {isPaletteMode ? "⌘K" : "↵"}
      </kbd>
    </button>
  );
}
