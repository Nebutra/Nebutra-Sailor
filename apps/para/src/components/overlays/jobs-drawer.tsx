"use client";

import { Cross } from "@nebutra/icons";
import { selectActiveJobs, useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";

/** Active jobs only. Completed outputs live in Library › Generated (A). Reached only via "View all". */
export function JobsDrawer() {
  const setDrawer = useUiStore((s) => s.setDrawer);
  const jobs = useJobsStore((s) => s.jobs);
  const cancel = useJobsStore((s) => s.cancel);
  const active = selectActiveJobs(jobs);
  return (
    <aside
      style={{ "--para-drawer-from": "12px" } as React.CSSProperties}
      className="para-drawer-enter flex w-[var(--para-drawer-w)] shrink-0 flex-col border-border/60 border-l bg-background"
    >
      <div className="flex h-11 items-center justify-between px-4">
        <span className="font-medium text-foreground text-sm">Jobs</span>
        <button
          type="button"
          aria-label="Close jobs"
          onClick={() => setDrawer(null)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Cross className="size-3.5" />
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto px-4 pb-6">
        {active.length === 0 && (
          <li className="text-muted-foreground text-xs">
            Nothing running. Finished outputs are in Library › Generated.
          </li>
        )}
        {active.map((j) => (
          <li
            key={j.id}
            className="flex items-center justify-between border-border/40 border-b py-2.5 text-sm"
          >
            <span className="text-foreground">{j.label}</span>
            <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
              {j.status === "running"
                ? `${Math.round(j.progress * 100)}%`
                : `queued · ${j.queuePosition ?? ""}`}
              <button
                type="button"
                onClick={() => cancel(j.id)}
                className="text-xs hover:text-foreground"
              >
                Cancel
              </button>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
