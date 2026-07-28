import { brand } from "@nebutra/brand/metadata";
import { AnimateIn } from "@nebutra/ui/components";
import { PageHeader } from "@nebutra/ui/layout";
import { DashboardPanel } from "@nebutra/ui/patterns";
import { type FleetMetric, FleetMetrics } from "@/components/fleet-metrics";
import type { FleetRow, FleetRuntime } from "@/lib/fleet";
import { buildFleet, unclaimedHosts } from "@/lib/fleet";

/**
 * Fleet — configuration state of the ecosystem.
 *
 * Phase 1 of the control plane. Every value on this page comes from repo
 * configuration (`brand.domains`, `DEPLOY_TARGET_*`, the PM2 ecosystem config),
 * so it is accurate about what the ecosystem is *supposed* to be and silent
 * about what it is actually doing. Live health probing is Phase 2 — see
 * docs/plans/2026-07-28-nebutra-admin-control-plane-design.md §5.1.
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

export default function FleetPage() {
  const rows = buildFleet();
  const unclaimed = unclaimedHosts();
  const drifting = rows.filter((row) => row.targetMatchesRuntime === false);
  const hosted = rows.filter((row) => Boolean(row.host));
  const onEcs = rows.filter((row) => row.runtime === "ecs-pm2");

  const metrics: FleetMetric[] = [
    {
      label: "Services",
      value: String(rows.length),
      detail: "Apps and backends tracked in the inventory",
      icon: "globe",
      tone: "blue",
    },
    {
      label: "Public hosts",
      value: String(hosted.length),
      detail: "Services owning a hostname in the domain SSOT",
      icon: "cloud",
      tone: "neutral",
    },
    {
      label: "On ECS origin",
      value: String(onEcs.length),
      detail: "PM2 processes on the shared VM",
      icon: "servers",
      tone: "green",
    },
    {
      label: "Target drift",
      value: String(drifting.length),
      detail: "Deploy target disagrees with where the service runs",
      icon: "warning",
      tone: drifting.length > 0 ? "amber" : "neutral",
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6">
      <PageHeader
        title="Fleet"
        description={`Configuration state of the ${brand.name} ecosystem. Nothing on this page is probed — live health lands in Phase 2.`}
      />

      <FleetMetrics metrics={metrics} />

      <AnimateIn preset="fadeUp">
        <DashboardPanel
          className="mt-6"
          title="Service matrix"
          description="Host, runtime, and configured deploy target per service."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-neutral-10 text-xs">
                  <th className="pb-2 pr-4 font-medium">Service</th>
                  <th className="pb-2 pr-4 font-medium">Host</th>
                  <th className="pb-2 pr-4 font-medium">Runtime</th>
                  <th className="pb-2 pr-4 font-medium">Deploy target</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="align-top odd:bg-neutral-2/60">
                    <td className="py-2.5 pr-4">
                      <span className="block font-medium text-neutral-12">{row.label}</span>
                      <span className="block font-mono text-[11px] text-neutral-9">{row.id}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-neutral-11">
                      {row.host ?? <span className="text-neutral-9">—</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <RuntimeCell row={row} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <TargetCell row={row} />
                    </td>
                    <td className="py-2.5 text-neutral-10 text-xs">{row.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <DashboardPanel
          className="mt-6"
          title="Unclaimed hosts"
          description="Hostnames in the domain SSOT that no service in this repo owns. Infrastructure hosts and external brand fronts are expected here."
        >
          <ul className="flex flex-wrap gap-1.5">
            {unclaimed.map((host) => (
              <li
                key={host}
                className="rounded-[var(--radius-sm)] bg-neutral-2 px-2 py-1 font-mono text-neutral-11 text-xs"
              >
                {host}
              </li>
            ))}
          </ul>
        </DashboardPanel>
      </AnimateIn>
    </div>
  );
}
