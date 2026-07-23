"use client";

import { Check, Clock } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * HealthGlyph
 *
 * Mini health-check endpoint preview for the @nebutra/health sub-package.
 * Header shows the `GET /healthz` request line with a READY StatusDot
 * and a 200 OK timing summary. Four service probe rows (database, redis,
 * queue, s3) each render a status badge with icon + latency. The footer
 * notes the composing package.
 */

type ProbeStatus = "ok" | "degraded";

type ProbeRow = {
  name: string;
  status: ProbeStatus;
  latency: string;
};

const PROBE_ROWS: ReadonlyArray<ProbeRow> = [
  { name: "database", status: "ok", latency: "2ms" },
  { name: "redis", status: "ok", latency: "1ms" },
  { name: "queue", status: "ok", latency: "1ms" },
  { name: "s3", status: "degraded", latency: "degraded" },
];

export function HealthGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-foreground">GET /healthz</span>
        <StatusDot state="READY" titlePrefix="healthz" decorative />
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
          200 OK · 4ms
        </span>
      </div>

      {/* Probe rows */}
      <div className="flex flex-1 flex-col justify-between gap-1">
        {PROBE_ROWS.map((row) => (
          <ProbeRowItem key={row.name} row={row} />
        ))}
      </div>

      {/* Footer */}
      <div className="font-mono text-[10px] text-muted-foreground">
        composed via @nebutra/health
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Probe row
// ---------------------------------------------------------------------------

interface ProbeRowItemProps {
  row: ProbeRow;
}

function ProbeRowItem({ row }: ProbeRowItemProps) {
  const isOk = row.status === "ok";
  const Icon = isOk ? Check : Clock;
  const badgeVariant = isOk ? "green-subtle" : "amber-subtle";

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-foreground">&middot; {row.name}</span>
      <Badge variant={badgeVariant} size="sm" className="ml-auto gap-1 font-mono text-[10px]">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        {row.latency}
      </Badge>
    </div>
  );
}
