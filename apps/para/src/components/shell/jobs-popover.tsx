"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { useEffect } from "react";
import { selectActiveJobs, useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * Top-bar indicator + popover — EXPERIMENTAL (0/6 competitors). Allowed because it never occupies the
 * workspace and is redundant by contract: the node is the primary status surface. Lists active jobs only;
 * hidden when empty. The mock scheduler ticks here so jobs run anywhere in the app.
 */
export function JobsIndicator() {
  const jobs = useJobsStore((s) => s.jobs);
  const tick = useJobsStore((s) => s.tick);
  const cancel = useJobsStore((s) => s.cancel);
  const setDrawer = useUiStore((s) => s.setDrawer);
  const active = selectActiveJobs(jobs);

  useEffect(() => {
    if (active.length === 0) return;
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [active.length, tick]);

  if (active.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${active.length} jobs`}
          className="flex h-[var(--para-h-chip)] items-center gap-1.5 rounded-md px-2 text-muted-foreground text-xs tabular-nums hover:bg-accent hover:text-foreground"
        >
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
          {active.length}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-2 font-medium text-foreground text-xs">Running</div>
        <ul className="space-y-1.5">
          {active.slice(0, 5).map((j) => (
            <li key={j.id} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{j.label}</span>
              <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
                {j.status === "running"
                  ? `${Math.round(j.progress * 100)}%`
                  : `queued · ${j.queuePosition ?? ""}`}
                <button
                  type="button"
                  onClick={() => cancel(j.id)}
                  className="hover:text-foreground"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setDrawer("jobs")}
          className="mt-3 text-muted-foreground text-xs hover:text-foreground"
        >
          View all
        </button>
      </PopoverContent>
    </Popover>
  );
}
