"use client";

import { HARNESS_PIPELINE_STEPS } from "@/lib/constants/landing-data";

/** Mini pipeline diagram for CI card */
export function MiniPipeline() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md p-5">
      <div className="flex items-center justify-between gap-1">
        {HARNESS_PIPELINE_STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20 mb-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">
                  {"\u2713"}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                {step}
              </span>
            </div>
            {i < HARNESS_PIPELINE_STEPS.length - 1 && (
              <div className="h-[2px] w-full min-w-2 bg-gradient-to-r from-emerald-500/40 to-emerald-500/20 -mt-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
