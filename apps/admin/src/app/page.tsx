import { brand } from "@nebutra/brand/metadata";
import { PageHeader } from "@nebutra/ui/layout";
import { DashboardPanel } from "@nebutra/ui/patterns";
import { FleetMatrix } from "@/components/fleet-matrix";
import { type FleetMetric, FleetMetrics } from "@/components/fleet-metrics";
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

      <DashboardPanel
        className="mt-6"
        title="Service matrix"
        description="Host, runtime, and configured deploy target per service."
      >
        <FleetMatrix rows={rows} />
      </DashboardPanel>

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
    </div>
  );
}
