import type { AdminStatus } from "@nebutra/contracts/admin";
import type { StatusTone } from "@/lib/format";
import type { ProbedFleetRow } from "@/lib/probe";
import { StatusDot } from "./status-dot";

export const FLEET_TONE: Record<AdminStatus, StatusTone> = {
  healthy: "ok",
  degraded: "warn",
  down: "bad",
  unknown: "unknown",
};

/** Compact cards for the Inbox page: name, dot, latency, version. */
export function FleetStrip({ rows }: { rows: ProbedFleetRow[] }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-col gap-1.5 rounded-md border border-border bg-card px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <StatusDot tone={FLEET_TONE[row.status]} />
            <span className="font-medium font-mono text-sm">{row.label}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span className="tabular-nums">
              {row.latencyMs !== null ? `${row.latencyMs} ms` : row.detail}
            </span>
            <span className="font-mono">{row.version ?? "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
