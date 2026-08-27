"use client";

import { DataList, type DataListColumn } from "@nebutra/ui/primitives";
import type { FleetRow, FleetRuntime } from "@/lib/fleet";

/**
 * Service matrix for the Fleet page.
 *
 * A client component for the same reason as `fleet-metrics.tsx`: `DataList`
 * is a client component and its column definitions carry render functions,
 * which React cannot serialize across the server/client boundary. The server
 * page hands over plain `FleetRow` data; the columns are declared here.
 */

const RUNTIME_LABEL: Record<FleetRuntime, string> = {
  vercel: "Vercel",
  "cloudflare-worker": "CF Worker",
  "ecs-pm2": "ECS PM2",
  "sanity-hosted": "Sanity",
  unpublished: "Not published",
};

function RuntimeCell({ row }: { row: FleetRow }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-[var(--radius-sm)] bg-neutral-3 px-1.5 py-0.5 text-[11px] text-neutral-11">
        {RUNTIME_LABEL[row.runtime]}
      </span>
      {row.port ? <span className="tabular-nums text-neutral-10 text-xs">:{row.port}</span> : null}
    </span>
  );
}

function TargetCell({ row }: { row: FleetRow }) {
  if (!row.deployTarget) {
    return <span className="text-neutral-9 text-xs">not switchable</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-neutral-11 text-xs">{row.deployTarget}</span>
      {/* Amber tint as the surface, --warning-strong as the ink: raw
          --status-warning is 2.05:1 on a light background and unreadable. */}
      {row.targetMatchesRuntime === false ? (
        <span className="rounded-[var(--radius-sm)] bg-[hsl(var(--warning))]/12 px-1.5 py-0.5 text-[11px] text-[hsl(var(--warning-strong))]">
          differs from runtime
        </span>
      ) : null}
    </span>
  );
}

const columns: readonly DataListColumn<FleetRow>[] = [
  {
    id: "service",
    header: "Service",
    loadingWidth: "70%",
    cell: (row) => (
      // The cell content sits inside DataList's flex alignment wrapper, so the
      // two stacked lines need their own block container or they lay out
      // side by side.
      <span className="block min-w-0">
        <span className="block font-medium text-neutral-12">{row.label}</span>
        <span className="block font-mono text-[11px] text-neutral-9">{row.id}</span>
      </span>
    ),
  },
  {
    id: "host",
    header: "Host",
    cellClassName: "text-neutral-11",
    cell: (row) => row.host ?? <span className="text-neutral-9">—</span>,
  },
  {
    id: "runtime",
    header: "Runtime",
    cell: (row) => <RuntimeCell row={row} />,
  },
  {
    id: "deploy-target",
    header: "Deploy target",
    loadingWidth: "50%",
    cell: (row) => <TargetCell row={row} />,
  },
  {
    id: "note",
    header: "Note",
    cellClassName: "text-neutral-10 text-xs",
    loadingWidth: "80%",
    cell: (row) => row.note ?? "",
  },
];

export function FleetMatrix({ rows }: { rows: readonly FleetRow[] }) {
  return (
    <DataList
      data-testid="fleet-matrix"
      label="Service matrix"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      striped
      // The matrix needs ~720px before the columns start crowding; below that
      // it scrolls inside its own container rather than widening the page.
      scrollClassName="[&_table]:min-w-[720px]"
      emptyTitle="The inventory resolved to zero services"
      emptyDescription="buildFleet() returned nothing — check the FLEET list in src/lib/fleet.ts and the DEPLOY_TARGET_* environment it reads."
    />
  );
}
