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
    label: "All Systems Operational",
    description: "All monitored public surfaces are responding normally.",
  },
  degraded: {
    label: "Degraded Performance",
    description: "At least one surface is slow, partially healthy, or returning warnings.",
  },
  outage: {
    label: "Major Service Outage",
    description: "One or more monitored services failed a public health check.",
  },
};

export const componentStatusLabel: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded performance",
  outage: "Major outage",
  unknown: "Unknown",
};

/** Pill / badge surfaces (bg + text + ring). */
export const stateSurfaceClass: Record<ServiceState, string> = {
  operational: "bg-success/10 text-[hsl(var(--success-strong))] ring-success/20",
  degraded: "bg-warning/12 text-[hsl(var(--warning-strong))] ring-warning/25",
  outage: "bg-destructive/10 text-[hsl(var(--destructive-strong))] ring-destructive/25",
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

/** Full-width overall banner. */
export const overallBannerClass: Record<Exclude<ServiceState, "unknown">, string> = {
  operational:
    "border-success/25 bg-success/10 text-[hsl(var(--success-strong))] dark:bg-success/15",
  degraded: "border-warning/30 bg-warning/10 text-[hsl(var(--warning-strong))] dark:bg-warning/15",
  outage:
    "border-destructive/30 bg-destructive/10 text-[hsl(var(--destructive-strong))] dark:bg-destructive/15",
};

export const UPTIME_WINDOW_DAYS = 90;
export const PAST_INCIDENT_DAYS = 14;

export interface UptimeDay {
  /** ISO date YYYY-MM-DD (UTC) */
  date: string;
  status: DayCellStatus;
  isToday: boolean;
}

/**
 * Build a Statuspage-style 90-day series from optional durable history.
 * Missing days stay `no_data` (muted) so we never invent green walls.
 * Today prefers live probe state (merged with any stored worst-of-day).
 */
export function buildUptimeSeries(
  liveState: ServiceState,
  history: Record<string, ServiceState> = {},
  now: Date = new Date(),
): UptimeDay[] {
  const days: UptimeDay[] = [];
  // Anchor to UTC midnight so SSR/client agree within the same UTC day.
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let offset = UPTIME_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const ms = utcToday - offset * 86_400_000;
    const d = new Date(ms);
    const date = d.toISOString().slice(0, 10);
    const isToday = offset === 0;
    const stored = history[date];
    let status: DayCellStatus;
    if (isToday) {
      status = liveState;
    } else if (stored) {
      status = stored;
    } else {
      status = "no_data";
    }
    days.push({ date, isToday, status });
  }
  return days;
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
