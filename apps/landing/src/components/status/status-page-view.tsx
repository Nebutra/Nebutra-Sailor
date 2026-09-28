import { brand } from "@nebutra/brand/metadata";
import {
  Calendar,
  CheckCircleFill,
  ChevronRight,
  CrossCircleFill,
  Information,
  WarningFill,
  Wrench,
} from "@nebutra/icons";
import { type IncidentImpact, maintenancePhase, type StatusIncident } from "@nebutra/status";
import { cn } from "@nebutra/ui/utils";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { ServiceProbe, ServiceState, StatusSnapshot } from "@/lib/status-checks";
import {
  buildPastIncidentDays,
  buildUptimeSeries,
  componentStatusLabel,
  formatUptime,
  formatUtcDay,
  formatUtcMedium,
  stateFillClass,
  UPTIME_WINDOW_DAYS,
} from "./status-vocabulary";
import { SubscribeMenu } from "./subscribe-menu";
import { UptimeBar } from "./uptime-bar";

/**
 * Public status surface, modelled on incident.io's hosted status pages:
 *   chrome (mark + Subscribe) → one-sentence verdict → ongoing incidents →
 *   maintenance → system status (uptime % + 90-day strip with day popovers)
 *   → recent incidents → footer feeds.
 * Marketing chrome is stripped so the page reads as a trust surface.
 */

export const impactLabel: Record<IncidentImpact, string> = {
  none: "No impact",
  minor: "Minor impact",
  major: "Major impact",
  critical: "Critical impact",
};

export const incidentStatusLabel: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const VERDICT: Record<StatusSnapshot["overall"], { title: string; body: string }> = {
  operational: {
    title: "We're fully operational",
    body: "We're not aware of any issues affecting our systems.",
  },
  degraded: {
    title: "We're experiencing degraded performance",
    body: "Some systems are slower or less reliable than usual.",
  },
  outage: {
    title: "We're experiencing a major outage",
    body: "One or more systems are unavailable.",
  },
};

export function StateIcon({ state, className }: { state: ServiceState; className?: string }) {
  if (state === "operational") {
    return <CheckCircleFill aria-hidden className={cn("text-success-strong", className)} />;
  }
  if (state === "outage") {
    return <CrossCircleFill aria-hidden className={cn("text-destructive-strong", className)} />;
  }
  return <WarningFill aria-hidden className={cn("text-warning-strong", className)} />;
}

export function StatusShell({ checkedAt, children }: { checkedAt?: string; children: ReactNode }) {
  return (
    <div className="bg-background text-foreground">
      <main id="main-content" className="px-4 pb-16 pt-8 sm:px-6">
        <div className="mx-auto w-full max-w-[760px]">
          <StatusActions checkedAt={checkedAt} />
          {children}
        </div>
      </main>
      <StatusFooter />
    </div>
  );
}

export function StatusPageView({ snapshot }: { snapshot: StatusSnapshot }) {
  // A declared critical incident outranks green probes: people see the
  // failure before the probe does.
  const declared: ServiceState = snapshot.activeIncidents.some((i) => i.impact === "critical")
    ? "outage"
    : snapshot.activeIncidents.some((i) => i.impact !== "none")
      ? "degraded"
      : "operational";
  const verdictState = worse(snapshot.overall, declared);
  const verdict = VERDICT[verdictState];
  const recent = recentIncidents(snapshot.incidents);
  const now = new Date(snapshot.checkedAt);

  return (
    <StatusShell checkedAt={snapshot.checkedAt}>
      <section
        aria-live="polite"
        aria-atomic="true"
        className={cn("overflow-hidden rounded-xl border", VERDICT_FRAME[verdictState])}
      >
        <div className={cn("flex items-center gap-2.5 px-5 py-3.5", VERDICT_HEAD[verdictState])}>
          <StateIcon state={verdictState} className="h-5 w-5 shrink-0" />
          <h1 className="text-lg font-medium tracking-tight text-foreground">{verdict.title}</h1>
        </div>
        <p className="bg-background px-5 py-4 text-base leading-6 text-foreground">
          {verdict.body}
        </p>
      </section>

      {snapshot.activeIncidents.length > 0 ? (
        <section className="mt-10 space-y-3" aria-label="Ongoing incidents">
          {snapshot.activeIncidents.map((incident) => (
            <IncidentSummaryCard
              key={incident.id}
              incident={incident}
              services={snapshot.services}
            />
          ))}
        </section>
      ) : null}

      {snapshot.maintenance.length > 0 ? (
        <section className="mt-10 space-y-3" aria-label="Maintenance">
          {snapshot.maintenance.map((item) => (
            <MaintenanceCard key={item.id} item={item} now={now} services={snapshot.services} />
          ))}
        </section>
      ) : null}

      <section
        className="mt-8 rounded-xl border border-border bg-background"
        aria-labelledby="status-components-heading"
      >
        <div className="flex items-center gap-4 border-b border-border px-5 py-4">
          <h2
            id="status-components-heading"
            className="text-lg font-medium tracking-tight text-foreground"
          >
            System status
          </h2>
          <p className="text-sm tabular-nums text-muted-foreground">{windowRange(now)}</p>
        </div>
        <ul className="divide-y divide-border">
          {snapshot.services.map((service) => (
            <ComponentRow
              key={service.id}
              service={service}
              incidents={snapshot.incidents}
              now={now}
            />
          ))}
        </ul>
        {!snapshot.historyDurable ? (
          <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted-foreground">
            History is not durable on this deployment. Prior days stay muted rather than shown
            green.
          </p>
        ) : null}
      </section>

      {recent.length > 0 ? (
        <section className="mt-8" aria-labelledby="status-history-heading">
          <h2
            id="status-history-heading"
            className="mb-3 text-lg font-medium tracking-tight text-foreground"
          >
            Recent incidents
          </h2>
          <IncidentList incidents={recent} />
        </section>
      ) : null}

      <div className="mt-8 flex justify-center">
        <Link
          href="/status/history"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-base font-medium text-foreground shadow-ambient-sm transition-colors hover:bg-muted/50"
        >
          <Calendar aria-hidden className="h-4 w-4" />
          View history
        </Link>
      </div>
    </StatusShell>
  );
}

const VERDICT_FRAME: Record<StatusSnapshot["overall"], string> = {
  operational: "border-success/60",
  degraded: "border-warning/60",
  outage: "border-destructive/60",
};

const VERDICT_HEAD: Record<StatusSnapshot["overall"], string> = {
  operational: "bg-success/12",
  degraded: "bg-warning/14",
  outage: "bg-destructive/10",
};

const RANK: Record<ServiceState, number> = { operational: 0, unknown: 1, degraded: 2, outage: 3 };

function worse(
  a: StatusSnapshot["overall"],
  b: StatusSnapshot["overall"],
): StatusSnapshot["overall"] {
  return RANK[b] > RANK[a] ? b : a;
}

export function windowRange(now: Date): string {
  const fmt = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });
  const start = new Date(now.getTime() - (UPTIME_WINDOW_DAYS - 1) * 86_400_000);
  return `${fmt.format(start)} – ${fmt.format(now)}`;
}

function recentIncidents(incidents: StatusIncident[]): StatusIncident[] {
  const oldest = buildPastIncidentDays().at(-1) ?? "";
  return incidents.filter(
    (i) => i.kind === "incident" && i.status === "resolved" && i.createdAt.slice(0, 10) >= oldest,
  );
}

export function IncidentList({ incidents }: { incidents: StatusIncident[] }) {
  return (
    <ol className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-background">
      {incidents.map((incident) => (
        <li key={incident.id} className="border-b border-border last:border-b-0">
          <Link
            href={`/status/incidents/${incident.id}`}
            className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{incident.title}</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {formatUtcDay(incident.createdAt.slice(0, 10))}
                {incident.resolvedAt ? ` · ${formatDuration(incident)}` : null}
                {incident.kind === "maintenance"
                  ? " · Maintenance"
                  : ` · ${impactLabel[incident.impact]}`}
              </p>
            </div>
            <ChevronRight
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function formatDuration(incident: StatusIncident): string {
  const start = Date.parse(incident.scheduledStart ?? incident.createdAt);
  const end = Date.parse(incident.resolvedAt ?? incident.scheduledEnd ?? new Date().toISOString());
  const minutes = Math.max(1, Math.round((end - start) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 48) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function serviceNames(ids: string[], services: Array<{ id: string; name: string }>) {
  return ids.map((id) => services.find((s) => s.id === id)?.name ?? id).join(", ");
}

const IMPACT_RAIL: Record<IncidentImpact, string> = {
  none: "before:bg-muted-foreground/40",
  minor: "before:bg-warning",
  major: "before:bg-warning",
  critical: "before:bg-destructive",
};

function IncidentSummaryCard({
  incident,
  services,
}: {
  incident: StatusIncident;
  services: ServiceProbe[];
}) {
  const latest = incident.updates.at(-1);
  return (
    <Link
      href={`/status/incidents/${incident.id}`}
      className={cn(
        "relative block overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-background py-4 pl-6 pr-5 shadow-ambient-sm transition-shadow hover:shadow-ambient-md",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        IMPACT_RAIL[incident.impact],
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {incidentStatusLabel[incident.status]} · {impactLabel[incident.impact]}
        </p>
        <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">
        {incident.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {latest?.message ?? incident.message}
      </p>
      {incident.affectedServiceIds.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Affects {serviceNames(incident.affectedServiceIds, services)}
        </p>
      ) : null}
    </Link>
  );
}

function MaintenanceCard({
  item,
  now,
  services,
}: {
  item: StatusIncident;
  now: Date;
  services: ServiceProbe[];
}) {
  const phase = maintenancePhase(item, now);
  return (
    <Link
      href={`/status/incidents/${item.id}`}
      className="block rounded-[var(--radius-2xl)] border border-border bg-background px-5 py-4 transition-colors hover:bg-muted/40"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Wrench aria-hidden className="h-3.5 w-3.5" />
        {phase === "in_progress" ? "Maintenance in progress" : "Scheduled maintenance"}
      </p>
      <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">{item.title}</h3>
      {item.scheduledStart ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {formatUtcMedium(item.scheduledStart)}
          {item.scheduledEnd ? ` → ${formatUtcMedium(item.scheduledEnd)}` : null}
        </p>
      ) : null}
      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {item.updates.at(-1)?.message ?? item.message}
      </p>
      {item.affectedServiceIds.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Affects {serviceNames(item.affectedServiceIds, services)}
        </p>
      ) : null}
    </Link>
  );
}

/**
 * The site header already carries the brand, so the status page adds only
 * its own action: Subscribe, top-right of the content column.
 */
function StatusActions({ checkedAt }: { checkedAt?: string }) {
  return (
    <div className="flex items-center justify-end gap-3 pb-6">
      {checkedAt ? (
        <time dateTime={checkedAt} className="text-xs tabular-nums text-muted-foreground">
          Updated {formatUtcMedium(checkedAt)}
        </time>
      ) : null}
      <SubscribeMenu />
    </div>
  );
}

function StatusFooter() {
  return (
    <footer className="px-4 pb-10 sm:px-6">
      <div className="mx-auto max-w-[760px] text-center text-sm text-muted-foreground">
        <p>
          Powered by <span className="font-semibold text-foreground">{brand.name} Status</span>
        </p>
        <p className="mt-2 text-xs leading-5">
          Availability is measured by public checks from outside our cloud every few minutes. ·{" "}
          <a href="/status.atom" className="hover:text-foreground">
            Atom
          </a>{" "}
          ·{" "}
          <a href="/status.json" className="hover:text-foreground">
            JSON
          </a>
        </p>
      </div>
    </footer>
  );
}

function ComponentRow({
  service,
  incidents,
  now,
}: {
  service: ServiceProbe;
  incidents: StatusIncident[];
  now: Date;
}) {
  const days = buildUptimeSeries(service.state, service.history ?? {}, now, {
    days: service.days,
    incidents,
    serviceId: service.id,
  });

  return (
    <li className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <StateIcon state={service.state} className="h-[18px] w-[18px] shrink-0" />
          <h3 className="truncate text-base font-medium text-foreground">{service.name}</h3>
          <span
            className="hidden text-muted-foreground sm:inline-flex"
            title={service.description}
            aria-label={service.description}
          >
            <Information aria-hidden className="h-3.5 w-3.5" />
          </span>
          {service.state !== "operational" ? (
            <span className="text-sm text-muted-foreground">
              {componentStatusLabel[service.state]}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {formatUptime(service.uptime90)} uptime
        </span>
      </div>
      <div className="mt-3">
        <UptimeBar days={days} />
      </div>
    </li>
  );
}

export function StatusPageSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border/80">
        <div className="mx-auto flex h-14 max-w-[760px] items-center px-4 sm:px-6">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="ml-2 h-3.5 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mx-auto max-w-[760px] px-4 pt-14 sm:px-6">
        <div className="h-9 w-80 max-w-full animate-pulse rounded bg-muted" />
        <div className="mt-12 h-80 animate-pulse rounded-[var(--radius-2xl)] bg-muted" />
        <div className="mt-12 h-32 animate-pulse rounded-[var(--radius-2xl)] bg-muted" />
      </div>
    </div>
  );
}
