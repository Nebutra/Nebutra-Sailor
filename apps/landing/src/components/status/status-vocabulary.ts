import type { IncidentImpact, StatusIncident } from "@nebutra/status";
import { type DayStats, dayUptime, mergeDayState } from "@nebutra/status/math";
import type { ServiceState } from "@/lib/status-checks";

/**
 * Statuspage-compatible vocabulary + presentation tokens.
 *
 * Copy is deliberately plain (GitHub Status / Atlassian Statuspage pattern):
 * predictable labels beat creative microcopy on a trust surface.
 *
 * Color: never color-only — every state pairs a fill with a text label.
 * Foregrounds use AA-safe strong steps where the base fill fails as ink.
 */

export type DayCellStatus = ServiceState | "no_data";

export const overallCopy: Record<
  Exclude<ServiceState, "unknown">,
  { label: string; description: string }
> = {
  operational: {
    label: "All systems operational",
    description: "All monitored public surfaces are responding normally.",
  },
  degraded: {
    label: "Degraded performance",
    description: "At least one surface is slow, partially healthy, or returning warnings.",
  },
  outage: {
    label: "Major service outage",
    description: "One or more monitored services failed a public health check.",
  },
};

/**
 * Overall banner body — name the failing surfaces when possible so the
 * headline is not a hollow marketing callout.
 */
export function overallDetail(
  overall: Exclude<ServiceState, "unknown">,
  services: ReadonlyArray<{ name: string; state: ServiceState }>,
): string {
  if (overall === "operational") {
    return overallCopy.operational.description;
  }

  const priority: ServiceState[] =
    overall === "outage" ? ["outage", "degraded", "unknown"] : ["degraded", "outage", "unknown"];
  const affected = services.filter((s) => priority.includes(s.state));
  if (affected.length === 0) {
    return overallCopy[overall].description;
  }

  const names = affected.map((s) => s.name);
  if (names.length === 1) {
    return overall === "outage"
      ? `${names[0]} is unavailable.`
      : `${names[0]} is degraded. See components below.`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} need attention. See components below.`;
  }
  return `${names[0]}, ${names[1]}, and ${names.length - 2} more need attention. See components below.`;
}

export const componentStatusLabel: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded performance",
  outage: "Major outage",
  unknown: "Unknown",
};

/** Pill / badge surfaces (bg + text + ring). */
export const stateSurfaceClass: Record<ServiceState, string> = {
  operational: "bg-success/10 text-success-strong ring-success/20",
  degraded: "bg-warning/12 text-warning-strong ring-warning/25",
  outage: "bg-destructive/10 text-destructive-strong ring-destructive/25",
  unknown: "bg-muted text-muted-foreground ring-[color:hsl(var(--border))]",
};

/** Solid dots / bar fills. */
export const stateFillClass: Record<DayCellStatus, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
  unknown: "bg-[color:hsl(var(--muted-foreground))]/45",
  no_data: "bg-[color:hsl(var(--muted-foreground))]/18",
};

/**
 * Overall banner chrome — Statuspage / GitHub pattern:
 * white card + 3–4px state rail, not a full-bleed tinted callout.
 */
export const overallBannerClass: Record<Exclude<ServiceState, "unknown">, string> = {
  operational: "border-border border-l-success bg-background",
  degraded: "border-border border-l-warning bg-background",
  outage: "border-border border-l-destructive bg-background",
};

export const UPTIME_WINDOW_DAYS = 90;
export const PAST_INCIDENT_DAYS = 14;

export interface UptimeDayIncident {
  id: string;
  title: string;
  impact: IncidentImpact;
}

export interface UptimeDay {
  /** ISO date YYYY-MM-DD (UTC) */
  date: string;
  status: DayCellStatus;
  isToday: boolean;
  /** Share of the day's checks that passed, 0–1; absent when the day has none. */
  uptime?: number;
  incidents: UptimeDayIncident[];
}

/**
 * Build a Statuspage-style 90-day series from durable history.
 * Missing days stay `no_data` (muted) so we never invent green walls.
 * Today is the worse of its recorded share and the live reading, so an outage
 * in progress shows before it has cost enough checks to colour the day.
 * An incident touching the component on a day raises that day to at least its impact.
 */
export function buildUptimeSeries(
  liveState: ServiceState,
  history: Record<string, ServiceState> = {},
  now: Date = new Date(),
  options: {
    days?: Record<string, DayStats>;
    incidents?: StatusIncident[];
    serviceId?: string;
  } = {},
): UptimeDay[] {
  const days: UptimeDay[] = [];
  // Anchor to UTC midnight so SSR/client agree within the same UTC day.
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const touching = (options.incidents ?? []).filter(
    (i) =>
      i.kind === "incident" &&
      (!options.serviceId || i.affectedServiceIds.includes(options.serviceId)),
  );

  for (let offset = UPTIME_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(utcToday - offset * 86_400_000).toISOString().slice(0, 10);
    const isToday = offset === 0;
    const stored: ServiceState | undefined = history[date];
    let status: DayCellStatus;
    if (isToday) {
      status = stored && stored !== "unknown" ? mergeDayState(stored, liveState) : liveState;
    } else {
      status = stored ?? "no_data";
    }
    const dayIncidents = touching.filter((i) => incidentSpansDay(i, date));
    for (const incident of dayIncidents) {
      const floor = IMPACT_STATE[incident.impact];
      if (floor) status = raiseTo(status, floor);
    }
    const stats = options.days?.[date];
    days.push({
      date,
      isToday,
      status,
      ...(stats && stats.total > 0 ? { uptime: dayUptime(stats) } : {}),
      incidents: dayIncidents.map(({ id, title, impact }) => ({ id, title, impact })),
    });
  }
  return days;
}

function raiseTo(status: DayCellStatus, floor: ServiceState): ServiceState {
  return status === "no_data" ? floor : mergeDayState(status, floor);
}

const IMPACT_STATE: Record<IncidentImpact, ServiceState | null> = {
  none: null,
  minor: "degraded",
  major: "degraded",
  critical: "outage",
};

function incidentSpansDay(incident: StatusIncident, date: string): boolean {
  const start = incident.createdAt.slice(0, 10);
  const end = (incident.resolvedAt ?? new Date().toISOString()).slice(0, 10);
  return date >= start && date <= end;
}

export function formatUptime(value: number | null | undefined): string {
  if (value == null) return "—";
  const pct = value * 100;
  // Two decimals like every hosted status page; never round 99.996 up to a claimed 100.
  return `${(Math.floor(pct * 100) / 100).toFixed(2)}%`;
}

export function buildPastIncidentDays(now: Date = new Date()): string[] {
  const dates: string[] = [];
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let offset = 0; offset < PAST_INCIDENT_DAYS; offset += 1) {
    const ms = utcToday - offset * 86_400_000;
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

export function formatUtcMedium(iso: string): string {
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;
}

export function formatUtcDay(isoDate: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00.000Z`));
}
