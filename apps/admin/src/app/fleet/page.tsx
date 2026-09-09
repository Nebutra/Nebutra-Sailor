import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { FLEET_TONE } from "@/components/fleet-strip";
import { PageTitle, Panel } from "@/components/panel";
import { StatusDot } from "@/components/status-dot";
import { cachedFleet } from "@/lib/console-data";
import type { FleetRuntime } from "@/lib/fleet";
import { relativeTime } from "@/lib/format";
import { requireStaff } from "@/lib/staff";
import { probeNow } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fleet" };

const RUNTIME_LABEL: Record<FleetRuntime, string> = {
  vercel: "Vercel",
  "cloudflare-worker": "CF Worker",
  "ecs-pm2": "ECS PM2",
  "sanity-hosted": "Sanity",
  unpublished: "Not published",
};

const HEAD =
  "h-9 whitespace-nowrap border-border border-b bg-muted/40 px-3 text-left font-medium text-muted-foreground text-xs leading-4";
const CELL = "h-11 overflow-hidden text-ellipsis whitespace-nowrap px-3 align-middle leading-5";

/**
 * Fleet — every service, probed. A row without a health endpoint says so in
 * grey; the config columns (host, runtime, target) come from the repo.
 */
export default async function FleetPage() {
  await requireStaff();
  const rows = await cachedFleet();
  const now = Date.now();
  const healthy = rows.filter((r) => r.status === "healthy").length;
  const drift = rows.filter((r) => r.targetMatchesRuntime === false).length;
  const latestProbe = rows
    .map((r) => r.probedAt)
    .filter((p): p is string => !!p)
    .sort()
    .at(-1);
  const probedLabel = latestProbe ? `probed ${relativeTime(latestProbe, now)}` : "not probed";

  return (
    <>
      <PageTitle
        title="Fleet"
        subtitle={`${rows.length} services · ${healthy} healthy · ${drift} target drift`}
        actions={
          <form action={probeNow}>
            <Button type="submit" variant="outline" size="sm">
              Probe now
            </Button>
          </form>
        }
      />

      <Panel
        title="Services"
        aside={<span className="text-muted-foreground text-xs">{probedLabel}</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col />
              <col className="w-[120px]" />
              <col className="w-[200px]" />
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={HEAD}>Status</th>
                <th className={HEAD}>Service</th>
                <th className={HEAD}>Host</th>
                <th className={HEAD}>Runtime</th>
                <th className={HEAD}>Target</th>
                <th className={HEAD}>Version</th>
                <th className={cn(HEAD, "text-right")}>Latency</th>
                <th className={HEAD}>Probed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const noEndpoint = row.health === null;
                return (
                  <tr
                    key={row.id}
                    className="border-border border-b last:border-b-0 hover:bg-muted/40"
                  >
                    <td className={CELL}>
                      <span className="inline-flex items-center gap-2">
                        <StatusDot tone={FLEET_TONE[row.status]} />
                        <span className={noEndpoint ? "text-muted-foreground" : ""}>
                          {noEndpoint ? "no health endpoint" : row.status}
                        </span>
                      </span>
                    </td>
                    <td className={CELL}>
                      <span className="block font-medium">{row.label}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground leading-4">
                        {row.id}
                      </span>
                    </td>
                    <td className={cn(CELL, "font-mono text-xs")}>
                      {row.host ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={CELL}>
                      {RUNTIME_LABEL[row.runtime]}
                      {row.port ? (
                        <span className="ml-1.5 text-muted-foreground text-xs tabular-nums">
                          :{row.port}
                        </span>
                      ) : null}
                    </td>
                    <td className={CELL}>
                      {row.deployTarget ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs">{row.deployTarget}</span>
                          {row.targetMatchesRuntime === false ? (
                            <span className="rounded-full bg-[hsl(var(--warning))]/12 px-1.5 text-[11px] text-[hsl(var(--warning-strong))] leading-4">
                              drift
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">not switchable</span>
                      )}
                    </td>
                    <td className={cn(CELL, "font-mono text-xs")}>
                      {row.version ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={cn(CELL, "text-right tabular-nums")}>
                      {row.latencyMs !== null ? (
                        `${row.latencyMs} ms`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(CELL, "text-muted-foreground text-xs")} title={row.detail}>
                      {row.probedAt ? relativeTime(row.probedAt, now) : row.detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
