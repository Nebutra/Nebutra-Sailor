"use client";

import { AnimateIn } from "@nebutra/ui/components";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

interface Props {
  cookieName: string;
}

export function DashboardHintCard({ cookieName }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    // 1-year cookie, root path, no JS-only flag (must be readable by server
    // for the gate in DashboardHint).
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${cookieName}=1; max-age=${oneYear}; path=/; SameSite=Lax`;
    setDismissed(true);
  }

  return (
    <AnimateIn preset="fadeUp">
      <div className="relative overflow-hidden rounded-2xl border border-blue-6 bg-blue-2/40 p-4 dark:border-blue-7/50 dark:bg-blue-2/10">
        {/* Decorative gradient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 opacity-[0.18] blur-3xl"
          style={{ background: "var(--brand-gradient)" }}
        />

        <div className="relative flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="flex-1 pr-6">
            <p className="text-sm font-semibold text-neutral-12 dark:text-white">
              Welcome to your Sailor workspace.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-11 dark:text-white/70">
              Press{" "}
              <kbd className="rounded border border-neutral-7 bg-neutral-1 px-1.5 py-0.5 font-mono text-[10px] text-neutral-12 dark:border-white/15 dark:bg-black/40 dark:text-white">
                ⌘K
              </kbd>{" "}
              to open the command palette. Pick a{" "}
              <span className="font-medium text-neutral-12 dark:text-white">mode</span> below to
              focus your work — chat, data, workflow, or search. Recent sessions appear here as you
              work.
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss hint"
            className="absolute right-0 top-0 rounded-md p-1 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </AnimateIn>
  );
}
