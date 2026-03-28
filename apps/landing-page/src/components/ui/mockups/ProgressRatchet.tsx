"use client";

import { HARNESS_RATCHET_BARS } from "@/lib/constants/landing-data";

/** Ratchet progress bars for Governance card */
export function ProgressRatchet() {
  return (
    <div className="space-y-4">
      {HARNESS_RATCHET_BARS.map((bar) => {
        const max = "ceiling" in bar ? bar.ceiling : bar.floor * 2;
        const percentage = Math.min((bar.current / max) * 100, 100);
        const threshold = "floor" in bar ? bar.floor : bar.ceiling;

        return (
          <div
            key={bar.label}
            className="rounded-xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 px-5 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                {bar.label}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {bar.current}/{threshold} {"floor" in bar ? "\u2265" : "\u2264"}{" "}
                {bar.pass ? "\u2713" : "\u2717"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-border/30 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[image:var(--brand-gradient)] transition-all duration-700"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
