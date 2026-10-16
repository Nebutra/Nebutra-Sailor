/**
 * Shapes the page snapshot into what the public pages draw: groups with their
 * rollups, the per-day bars with the incidents that touched each day, the
 * evidence line, and the history calendar. Pure — every rule is tested.
 */
import type { ComponentState, ComponentVerdict, EvidenceCoverage } from "@/server/evaluate";
import type { SnapshotComponent, SnapshotDay, SnapshotIncident } from "@/server/snapshot";

export type DayState = ComponentState | "no_data";

const SEVERITY: Record<DayState, number> = {
  no_data: -1,
  operational: 0,
  maintenance: 1,
  unknown: 2,
  degraded: 3,
  outage: 4,
};

export function worstState<T extends DayState>(states: T[]): T | "no_data" {
  return states.reduce<T | "no_data">(
    (acc, s) => (SEVERITY[s] > SEVERITY[acc] ? s : acc),
    "no_data",
  );
}

export interface DayIncident {
  id: string;
  title: string;
  impact: SnapshotIncident["impact"];
}

export interface BarDay {
  date: string;
  state: DayState;
  uptime: number | null;
  total: number;
  avgLatencyMs: number | null;
  incidents: DayIncident[];
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Incidents (not maintenance) that were open at any point of a UTC day and touched these keys. */
export function incidentsOnDay(
  incidents: SnapshotIncident[],
  componentKeys: string[] | null,
  dayKey: string,
  now: Date,
): DayIncident[] {
  return incidents
    .filter((i) => i.kind === "incident")
    .filter((i) => componentKeys === null || i.componentKeys.some((k) => componentKeys.includes(k)))
    .filter((i) => {
      const start = utcDayKey(i.createdAt);
      const end = utcDayKey(i.resolvedAt ?? now);
      return dayKey >= start && dayKey <= end;
    })
    .map((i) => ({ id: i.id, title: i.title, impact: i.impact }));
}

export function componentBar(
  component: SnapshotComponent,
  incidents: SnapshotIncident[],
  now: Date,
): BarDay[] {
  return component.days.map((d) => ({
    ...d,
    incidents: incidentsOnDay(incidents, [component.key], d.date, now),
  }));
}

/**
 * Several components' days merged into one bar: the worst state, the mean of
 * measured uptimes, all readings summed, latency weighted by readings.
 * A day with no readings anywhere stays no_data.
 */
export function mergeDays(series: SnapshotDay[][]): SnapshotDay[] {
  const first = series[0];
  if (!first) return [];
  return first.map((_, i) => {
    const days = series.map((s) => s[i]).filter((d): d is SnapshotDay => Boolean(d));
    const measured = days.filter((d) => d.uptime !== null);
    const withLatency = days.filter((d) => d.avgLatencyMs !== null && d.total > 0);
    const latencyWeight = withLatency.reduce((n, d) => n + d.total, 0);
    return {
      date: first[i]?.date ?? "",
      state: worstState(days.map((d) => d.state)),
      uptime:
        measured.length === 0
          ? null
          : measured.reduce((n, d) => n + (d.uptime ?? 0), 0) / measured.length,
      total: days.reduce((n, d) => n + d.total, 0),
      avgLatencyMs:
        latencyWeight === 0
          ? null
          : Math.round(
              withLatency.reduce((n, d) => n + (d.avgLatencyMs ?? 0) * d.total, 0) / latencyWeight,
            ),
    };
  });
}

export function meanUptime(values: Array<number | null>): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0) / known.length;
}

/** A group's merged strip, with the incidents that touched any of its components. */
export function groupBar(
  group: ComponentGroupView,
  incidents: SnapshotIncident[],
  now: Date,
): BarDay[] {
  const keys = group.components.map((c) => c.key);
  return group.days.map((d) => ({ ...d, incidents: incidentsOnDay(incidents, keys, d.date, now) }));
}

export interface ComponentGroupView {
  key: string | null;
  name: string | null;
  nameI18n: Record<string, string> | null;
  components: SnapshotComponent[];
  state: ComponentState;
  uptime90: number | null;
  days: SnapshotDay[];
}

/**
 * Groups in the operator's order, each with its components. Components with
 * no group come last as an "other" block (key `null`) — never above the
 * groups at the same weight. With no groups at all, that block is the page.
 * Empty groups are dropped: a heading with nothing under it is noise.
 */
export function groupComponents(
  groups: Array<{ key: string; name: string; nameI18n: Record<string, string> | null }>,
  components: SnapshotComponent[],
): ComponentGroupView[] {
  const known = new Set(groups.map((g) => g.key));
  const view = (
    key: string | null,
    name: string | null,
    nameI18n: Record<string, string> | null,
    members: SnapshotComponent[],
  ): ComponentGroupView => ({
    key,
    name,
    nameI18n,
    components: members,
    state: worstState(members.map((c) => c.verdict.state)) as ComponentState,
    uptime90: meanUptime(members.map((c) => c.uptime90)),
    days: mergeDays(members.map((c) => c.days)),
  });
  const out: ComponentGroupView[] = [];
  for (const g of groups) {
    const members = components.filter((c) => c.groupKey === g.key);
    if (members.length > 0) out.push(view(g.key, g.name, g.nameI18n, members));
  }
  const loose = components.filter((c) => !c.groupKey || !known.has(c.groupKey));
  if (loose.length > 0) out.push(view(null, null, null, loose));
  return out;
}

/** A group opens by default only for real trouble or planned work — not for a quiet source. */
export function groupStartsOpen(state: ComponentState): boolean {
  return state === "degraded" || state === "outage" || state === "maintenance";
}

/** Strongest claim first: a user journey proves more than a ping. */
const COVERAGE_RANK: EvidenceCoverage[] = [
  "synthetic",
  "device",
  "upstream",
  "dependency",
  "manual",
];

export interface EvidenceLine {
  /** What the freshest proof is, or why there is none. */
  kind: EvidenceCoverage | "none" | "stale";
  /** True when that proof is passing; false when it is fresh but failing. */
  passing: boolean;
  at: Date | null;
  /** Set when some source has gone quiet: minutes since its last reading. */
  staleMinutes: number | null;
  /** The quiet source's name and seconds since it last reported. */
  quiet: { source: string; ageSeconds: number } | null;
}

/**
 * The line under each component that says what its colour rests on — our
 * differentiator. Never claims more than the evidence: a stale source is
 * named as stale even when another source is fresh.
 */
export function evidenceLine(verdict: ComponentVerdict, now: Date): EvidenceLine {
  const fresh = verdict.evidence.filter((e) => !e.stale);
  const stale = verdict.evidence.filter((e) => e.stale);
  const quietSince = stale.reduce<Date | null>(
    (acc, e) => (!acc || e.checkedAt > acc ? e.checkedAt : acc),
    null,
  );
  const quietest = stale.reduce<(typeof stale)[number] | null>(
    (acc, e) => (!acc || e.checkedAt > acc.checkedAt ? e : acc),
    null,
  );
  const quiet = quietest
    ? {
        source: quietest.source,
        ageSeconds: Math.max(0, (now.getTime() - quietest.checkedAt.getTime()) / 1000),
      }
    : null;
  const staleMinutes = quietSince
    ? Math.max(1, Math.floor((now.getTime() - quietSince.getTime()) / 60_000))
    : null;
  if (verdict.evidence.length === 0) {
    return { kind: "none", passing: false, at: null, staleMinutes: null, quiet: null };
  }
  if (fresh.length === 0) {
    return { kind: "stale", passing: false, at: quietSince, staleMinutes, quiet };
  }
  for (const coverage of COVERAGE_RANK) {
    const of = fresh.filter((e) => e.coverage === coverage);
    if (of.length === 0) continue;
    const newest = of.reduce((a, b) => (b.checkedAt > a.checkedAt ? b : a));
    const passing = of.every((e) => e.effectiveState === "operational");
    return { kind: coverage, passing, at: newest.checkedAt, staleMinutes, quiet };
  }
  return { kind: "none", passing: false, at: null, staleMinutes, quiet };
}

/** The newest reading across every component — what "updated" honestly means. */
export function newestReading(components: SnapshotComponent[]): Date | null {
  return components.reduce<Date | null>((acc, c) => {
    const at = c.verdict.checkedAt;
    return at && (!acc || at > acc) ? at : acc;
  }, null);
}

export type IncidentStep = "investigating" | "identified" | "monitoring" | "resolved";
export const INCIDENT_STEPS: IncidentStep[] = [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
];

/** When each lifecycle step was first reached; skipped steps stay null. */
export function stepTimes(
  updates: Array<{ status: string; createdAt: Date }>,
): Record<IncidentStep, Date | null> {
  const out: Record<IncidentStep, Date | null> = {
    investigating: null,
    identified: null,
    monitoring: null,
    resolved: null,
  };
  for (const u of updates) {
    const step = u.status as IncidentStep;
    if (step in out && !out[step]) out[step] = u.createdAt;
  }
  return out;
}

export function incidentDurationMs(incident: SnapshotIncident, now: Date): number {
  const start = incident.scheduledStart ?? incident.createdAt;
  const end =
    incident.resolvedAt ?? (incident.kind === "maintenance" ? incident.scheduledEnd : null) ?? now;
  return Math.max(0, end.getTime() - start.getTime());
}

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  /** Outside the measured window or in the future: drawn blank, never green. */
  inWindow: boolean;
}

/** Monday-first weeks covering a UTC month. */
export function monthGrid(year: number, month: number, window: Set<string>): CalendarDay[][] {
  const first = Date.UTC(year, month, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells; i += 1) {
    const date = new Date(first + (i - lead) * 86_400_000).toISOString().slice(0, 10);
    const inMonth = i >= lead && i < lead + daysInMonth;
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]?.push({ date, inMonth, inWindow: inMonth && window.has(date) });
  }
  return weeks;
}

/** Months touched by the window, newest first, as [year, monthIndex]. */
export function windowMonths(dates: string[]): Array<[number, number]> {
  const seen: Array<[number, number]> = [];
  for (const d of dates) {
    const y = Number(d.slice(0, 4));
    const m = Number(d.slice(5, 7)) - 1;
    if (!seen.some(([sy, sm]) => sy === y && sm === m)) seen.push([y, m]);
  }
  return seen.reverse();
}

/** Incidents grouped by the UTC month they started in, newest month first. */
export function incidentsByMonth(
  incidents: SnapshotIncident[],
): Array<{ year: number; month: number; incidents: SnapshotIncident[] }> {
  const sorted = [...incidents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const out: Array<{ year: number; month: number; incidents: SnapshotIncident[] }> = [];
  for (const i of sorted) {
    const year = i.createdAt.getUTCFullYear();
    const month = i.createdAt.getUTCMonth();
    const last = out[out.length - 1];
    if (last && last.year === year && last.month === month) last.incidents.push(i);
    else out.push({ year, month, incidents: [i] });
  }
  return out;
}
