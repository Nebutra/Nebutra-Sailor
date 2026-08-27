"use client";

import { Box, Check, Clock, Database, Lightning, LockClosed } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";
import type { SubpackageGlyphProps } from "./types";

/**
 * SupabaseGlyph
 *
 * Mini Supabase project services card. Header shows the project ref and a
 * READY status dot. A 2×2 grid renders the four core Supabase services
 * (Database, Auth, Storage, Edge fn) with their health icon + a brief
 * metric. Footer pins the region and a note that this provider is opt-in.
 */

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type ServiceStatus = "ok" | "warn";

type ServiceRow = {
  key: string;
  label: string;
  Icon: IconComponent;
  status: ServiceStatus;
  metric: string;
};

const SERVICE_ROWS: ReadonlyArray<ServiceRow> = [
  { key: "db", label: "Database", Icon: Database, status: "ok", metric: "12.4 GB" },
  { key: "auth", label: "Auth", Icon: LockClosed, status: "ok", metric: "847 users" },
  { key: "storage", label: "Storage", Icon: Box, status: "ok", metric: "4.2 GB" },
  { key: "edge", label: "Edge fn", Icon: Lightning, status: "warn", metric: "cold start" },
];

export function SupabaseGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="truncate font-mono text-[11px] text-foreground">
          Supabase project &middot; acme-saas
        </span>
        <StatusDot state="READY" titlePrefix="supabase" decorative className="ml-auto" />
      </div>

      {/* Services 2×2 grid */}
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        {SERVICE_ROWS.map((row) => (
          <ServiceCell key={row.key} row={row} />
        ))}
      </div>

      {/* Footer */}
      <div className="font-mono text-[10px] text-muted-foreground">
        eu-west-1 &middot; vendor-lock-in opt-in
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service cell
// ---------------------------------------------------------------------------

interface ServiceCellProps {
  row: ServiceRow;
}

function ServiceCell({ row }: ServiceCellProps) {
  const isOk = row.status === "ok";
  const StatusIcon = isOk ? Check : Clock;
  const badgeVariant = isOk ? "green-subtle" : "amber-subtle";

  return (
    <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-background px-2 py-1 ring-1 ring-[hsl(var(--border))]">
      <row.Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate font-mono text-[10px] text-foreground">{row.label}</span>
      <Badge variant={badgeVariant} size="sm" className="ml-auto gap-1 font-mono text-[9px]">
        <StatusIcon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
        <span className="tabular-nums">{row.metric}</span>
      </Badge>
    </div>
  );
}
