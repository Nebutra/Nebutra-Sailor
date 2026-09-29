"use client";

import { Cross } from "@nebutra/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { useEffect } from "react";
import { Chip } from "@/components/ui/chip";
import { selectActiveJobs, useJobsStore } from "@/stores/jobs-store";

/**
 * Top-bar indicator + popover — EXPERIMENTAL (0/6 competitors). Allowed because it never occupies the
 * workspace and is redundant by contract: the node is the primary status surface. Lists active jobs
 * only; hidden when there are none. The mock scheduler ticks here so jobs run anywhere in the app.
 */
export function JobsIndicator() {
  const jobs = useJobsStore((s) => s.jobs);
  const tick = useJobsStore((s) => s.tick);
  const cancel = useJobsStore((s) => s.cancel);
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
        <Chip aria-label={`${active.length} 个生成任务进行中`} className="gap-1.5 tabular-nums">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
          生成中 {active.length}
        </Chip>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="mb-2 font-medium text-foreground text-label">进行中的生成</div>
        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {active.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-2 text-label">
              <span className="min-w-0 truncate text-foreground">{j.label}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground tabular-nums">
                {j.status === "running"
                  ? `${Math.round(j.progress * 100)}%`
                  : `排队 · ${j.queuePosition ?? ""}`}
                <Chip
                  tone="muted"
                  aria-label="取消"
                  onClick={() => cancel(j.id)}
                  className="size-6 h-6 justify-center p-0"
                >
                  <Cross className="size-3" />
                </Chip>
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
