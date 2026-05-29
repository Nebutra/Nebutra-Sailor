"use client";

import { StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * QueueGlyph
 *
 * Mini job-list dashboard for the @nebutra/queue sub-package. Four narrow
 * rows stacked vertically, each showing a status dot, a monospaced job id,
 * a status label, and a ms duration on the right. The top row is actively
 * processing (StatusDot state="BUILDING" pulses).
 */

type JobState = "BUILDING" | "READY" | "ERROR" | "QUEUED";

type JobRow = {
  id: string;
  state: JobState;
  status: string;
  duration: string;
};

const JOB_ROWS: ReadonlyArray<JobRow> = [
  { id: "job_9f3a", state: "BUILDING", status: "processing", duration: "412ms" },
  { id: "job_8c41", state: "READY", status: "success", duration: "184ms" },
  { id: "job_6b22", state: "ERROR", status: "failed", duration: "5012ms" },
  { id: "job_5a18", state: "QUEUED", status: "pending", duration: "—" },
];

const STATUS_COLOR: Readonly<Record<JobState, string>> = {
  BUILDING: "text-[color:var(--status-warning)]",
  READY: "text-[color:var(--status-success)]",
  ERROR: "text-[color:var(--status-danger)]",
  QUEUED: "text-[var(--neutral-11)]",
};

export function QueueGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-1 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-3"
      style={{ height: 160 }}
    >
      {JOB_ROWS.map((row) => (
        <div
          key={row.id}
          className="flex h-7 items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-2.5"
        >
          <StatusDot state={row.state} titlePrefix={row.id} decorative />
          <span className="font-mono text-[11px] text-[var(--neutral-12)]">{row.id}</span>
          <span className={`font-mono text-[11px] ${STATUS_COLOR[row.state]}`}>
            &middot; {row.status}
          </span>
          <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--neutral-11)]">
            {row.duration}
          </span>
        </div>
      ))}
    </div>
  );
}
