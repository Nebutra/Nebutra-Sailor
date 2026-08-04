import { LogomarkSVG } from "@nebutra/brand";
import { cn } from "@nebutra/ui/utils";
import { Link } from "@/i18n/navigation";
import type { ServiceProbe, StatusSnapshot } from "@/lib/status-checks";
import type { IncidentImpact, StatusIncident } from "@/lib/status-incidents";
import {
  buildPastIncidentDays,
  buildUptimeSeries,
  componentStatusLabel,
  formatUtcDay,
  formatUtcMedium,
  overallBannerClass,
  overallCopy,
  overallDetail,
  stateFillClass,
  stateSurfaceClass,
} from "./status-vocabulary";
import { UptimeBar } from "./uptime-bar";

/**
 * Statuspage-paradigm public status surface.
 *
 * IA (GitHub Status / Atlassian Statuspage / incident.io):
 *   chrome → overall banner → active incidents → components (+ 90d bars)
 *   → maintenance → past incidents
 */

const impactLabel: Record<IncidentImpact, string> = {
  none: "No impact",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

export function StatusPageView({ snapshot }: { snapshot: StatusSnapshot }) {
  const overall = overallCopy[snapshot.overall];
  const detail = overallDetail(snapshot.overall, snapshot.services);
  const pastDays = buildPastIncidentDays();
  const healthy = snapshot.services.filter((s) => s.state === "operational").length;
  const incidentsByDay = groupByCreatedDay(snapshot.incidents);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StatusChrome checkedAt={snapshot.checkedAt} />

      <main id="main-content" className="px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <div className="mx-auto w-full max-w-[720px]">
          <section
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "rounded-xl border border-l-4 px-4 py-4 sm:px-5 sm:py-4",
              overallBannerClass[snapshot.overall],
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                      stateSurfaceClass[snapshot.overall],
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        stateFillClass[snapshot.overall],
                        snapshot.overall === "operational" && "motion-safe:animate-pulse",
                      )}
                    />
                    {overall.label}
                  </span>
                </div>
                <h1 className="sr-only">{overall.label}</h1>
                <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {healthy}/{snapshot.services.length} operational
              </p>
            </div>
            <p className="mt-2.5 text-xs tabular-nums text-muted-foreground">
              Updated {formatUtcMedium(snapshot.checkedAt)}
            </p>
          </section>

          {snapshot.activeIncidents.length > 0 ? (
            <section className="mt-8" aria-labelledby="status-active-incidents-heading">
              <h2
                id="status-active-incidents-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Active incidents
              </h2>
              <ul className="mt-3 space-y-3">
                {snapshot.activeIncidents.map((incident) => (
                  <li key={incident.id}>
                    <IncidentCard incident={incident} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8" aria-labelledby="status-components-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2
                id="status-components-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Components
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {snapshot.historyDurable
                  ? "Durable history · 90-day strip"
                  : "Live checks · 90-day strip"}
              </p>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[color:hsl(var(--border))] bg-background shadow-ambient-sm">
              <ul className="divide-y divide-[color:hsl(var(--border))]">
                {snapshot.services.map((service) => (
                  <ComponentRow key={service.id} service={service} />
                ))}
              </ul>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {snapshot.historyDurable
                ? "Uptime bars use worst-of-day status recorded from public edge probes."
                : "History is not durable yet (set UPSTASH_REDIS_REST_*). Prior days stay muted — we do not invent a green wall."}
            </p>
          </section>

          <section className="mt-10" aria-labelledby="status-maintenance-heading">
            <h2
              id="status-maintenance-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Scheduled maintenance
            </h2>
            <div className="mt-3 rounded-[var(--radius-2xl)] border border-dashed border-[color:hsl(var(--border))] px-4 py-5">
              <p className="text-sm text-muted-foreground">
                No maintenance windows are currently scheduled.
              </p>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="status-history-heading">
            <h2
              id="status-history-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Past incidents
            </h2>
            <ol className="mt-3 overflow-hidden rounded-[var(--radius-2xl)] border border-[color:hsl(var(--border))] bg-background">
              {pastDays.map((date) => {
                const dayIncidents = incidentsByDay[date] ?? [];
                return (
                  <li
                    key={date}
                    className="border-b border-[color:hsl(var(--border))] px-4 py-3 last:border-b-0 sm:px-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <time
                        dateTime={date}
                        className="shrink-0 text-sm font-medium tabular-nums text-foreground"
                      >
                        {formatUtcDay(date)}
                      </time>
                      {dayIncidents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No incidents reported.</p>
                      ) : (
                        <ul className="min-w-0 flex-1 space-y-2">
                          {dayIncidents.map((incident) => (
                            <li key={incident.id} className="text-sm">
                              <span className="font-medium text-foreground">{incident.title}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                · {impactLabel[incident.impact]} · {incident.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <footer className="mt-12 border-t border-[color:hsl(var(--border))] pt-6 text-center text-xs leading-5 text-muted-foreground">
            <p>
              Machine-readable snapshot:{" "}
              <a
                href="/status.json"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                /status.json
              </a>
            </p>
            <p className="mt-1">
              Powered by Nebutra edge probes · Independent of the app origin when possible
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function groupByCreatedDay(incidents: StatusIncident[]): Record<string, StatusIncident[]> {
  const out: Record<string, StatusIncident[]> = {};
  for (const incident of incidents) {
    const day = incident.createdAt.slice(0, 10);
    const bucket = out[day] ?? [];
    bucket.push(incident);
    out[day] = bucket;
  }
  return out;
}

function IncidentCard({ incident }: { incident: StatusIncident }) {
  return (
    <article className="rounded-[var(--radius-2xl)] border border-destructive/25 bg-destructive/5 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--destructive-strong))] ring-1 ring-destructive/25">
          {impactLabel[incident.impact]}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {incident.status}
        </span>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">
        {incident.title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{incident.message}</p>
      {incident.updates.length > 1 ? (
        <ol className="mt-3 space-y-2 border-t border-[color:hsl(var(--border))] pt-3">
          {[...incident.updates].reverse().map((update) => (
            <li key={`${update.at}-${update.status}`} className="text-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {update.status}
                <span className="mx-1.5 font-normal normal-case tracking-normal">
                  {formatUtcMedium(update.at)}
                </span>
              </p>
              <p className="mt-0.5 text-muted-foreground">{update.message}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

/**
 * Trust-page chrome — GitHub Status / Atlassian Statuspage pattern:
 * small monochrome mark + “Status” word, quiet meta, no marketing mega-logo.
 */
function StatusChrome({ checkedAt }: { checkedAt: string }) {
  return (
    <header className="border-b border-border/80 bg-background">
      <div className="mx-auto flex h-12 max-w-[720px] items-center justify-between gap-4 px-4 sm:h-[3.25rem] sm:px-6">
        <Link
          href="/status"
          className="group flex min-w-0 items-center gap-2 rounded-md outline-offset-2"
          aria-label="Nebutra Status"
        >
          <LogomarkSVG
            className="h-5 w-5 shrink-0 text-foreground sm:h-[1.375rem] sm:w-[1.375rem]"
            aria-hidden
          />
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[13px] font-semibold tracking-tight text-foreground sm:text-sm">
              Nebutra
            </span>
            <span aria-hidden className="hidden h-3 w-px shrink-0 bg-border sm:block" />
            <span className="text-[13px] font-medium tracking-tight text-muted-foreground sm:text-sm">
              Status
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <time
            dateTime={checkedAt}
            className="hidden text-[11px] tabular-nums tracking-tight text-muted-foreground sm:inline"
          >
            {formatUtcMedium(checkedAt)}
          </time>
          <a
            href="/status.json"
            className={cn(
              "text-[11px] font-medium tracking-wide text-muted-foreground",
              "underline-offset-4 transition-colors hover:text-foreground hover:underline",
            )}
          >
            JSON
          </a>
        </div>
      </div>
    </header>
  );
}

function ComponentRow({ service }: { service: ServiceProbe }) {
  const days = buildUptimeSeries(service.state, service.history ?? {});
  const label = componentStatusLabel[service.state];
  const metaParts = [service.note];
  if (service.latencyMs != null) metaParts.push(`${service.latencyMs} ms`);
  if (service.statusCode != null) metaParts.push(`HTTP ${service.statusCode}`);

  return (
    <li className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
            {service.name}
          </h3>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
              stateSurfaceClass[service.state],
            )}
          >
            <span
              aria-hidden="true"
              className={cn("h-1.5 w-1.5 rounded-full", stateFillClass[service.state])}
            />
            {label}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p>
        <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
          {metaParts.join(" · ")}
        </p>
      </div>

      <div className="mt-3.5">
        <UptimeBar days={days} />
      </div>
    </li>
  );
}

export function StatusPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/80">
        <div className="mx-auto flex h-12 max-w-[720px] items-center px-4 sm:h-[3.25rem] sm:px-6">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="ml-2 h-3.5 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mx-auto max-w-[720px] px-4 pt-8 sm:px-6">
        <div className="h-16 animate-pulse rounded-xl border border-border bg-muted/60" />
        <div className="mt-8 h-72 animate-pulse rounded-[var(--radius-2xl)] bg-muted" />
        <div className="mt-10 h-48 animate-pulse rounded-[var(--radius-2xl)] bg-muted" />
      </div>
    </div>
  );
}
