/**
 * Everything a status page shows, read once and evaluated in memory: groups,
 * components with their verdicts, 90 days of history, open incidents,
 * maintenance and recent history. Pages, JSON, feeds and compat profiles are
 * all renderings of this one object.
 */
import type { StatusDb } from "./db";
import {
  type ActiveIncidentRef,
  type ComponentState,
  type ComponentVerdict,
  dayState,
  dayUptime,
  evaluateComponent,
  overallState,
} from "./evaluate";
import { maintenancePhase } from "./incidents";

export const HISTORY_DAYS = 90;

export interface SnapshotDay {
  date: string;
  state: ComponentState | "no_data";
  uptime: number | null;
  total: number;
  avgLatencyMs: number | null;
}

export interface SnapshotComponent {
  id: string;
  key: string;
  name: string;
  nameI18n: Record<string, string> | null;
  description: string | null;
  groupKey: string | null;
  isPublic: boolean;
  verdict: ComponentVerdict;
  days: SnapshotDay[];
  uptime90: number | null;
}

export interface SnapshotIncident {
  id: string;
  kind: "incident" | "maintenance";
  title: string;
  impact: "none" | "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  phase: "scheduled" | "in_progress" | "completed" | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  componentKeys: string[];
  updates: Array<{
    status: string;
    message: string;
    messageI18n: Record<string, string> | null;
    createdAt: Date;
  }>;
}

export interface PageSnapshot {
  page: {
    id: string;
    workspaceId: string;
    slug: string;
    title: string;
    description: string | null;
    locales: string[];
    compatProfile: string | null;
  };
  generatedAt: Date;
  overall: "operational" | "degraded" | "outage";
  groups: Array<{ key: string; name: string; nameI18n: Record<string, string> | null }>;
  components: SnapshotComponent[];
  activeIncidents: SnapshotIncident[];
  maintenance: SnapshotIncident[];
  recentIncidents: SnapshotIncident[];
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function windowDates(now: Date): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: HISTORY_DAYS }, (_, i) =>
    new Date(today - (HISTORY_DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

export async function buildPageSnapshot(
  db: StatusDb,
  where: { slug: string } | { id: string },
  options: { now?: Date; includeInternal?: boolean } = {},
): Promise<PageSnapshot | null> {
  const now = options.now ?? new Date();
  const dates = windowDates(now);
  const since = new Date(`${dates[0]}T00:00:00.000Z`);

  const page = await db.page.findUnique({
    where,
    include: {
      groups: { orderBy: [{ position: "asc" }, { name: "asc" }] },
      components: {
        where: options.includeInternal ? {} : { isPublic: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          group: { select: { key: true } },
          evidence: true,
          days: { where: { day: { gte: since } } },
        },
      },
      incidents: {
        where: {
          OR: [{ status: { not: "resolved" } }, { createdAt: { gte: since } }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          updates: { orderBy: { createdAt: "asc" } },
          components: { include: { component: { select: { key: true } } } },
        },
      },
    },
  });
  if (!page) return null;

  const incidents: SnapshotIncident[] = page.incidents.map((i) => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    impact: i.impact,
    status: i.status,
    phase: i.kind === "maintenance" ? maintenancePhase(i, now) : null,
    scheduledStart: i.scheduledStart,
    scheduledEnd: i.scheduledEnd,
    resolvedAt: i.resolvedAt,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    componentKeys: i.components.map((c) => c.component.key),
    updates: i.updates.map((u) => ({
      status: u.status,
      message: u.message,
      messageI18n: (u.messageI18n as Record<string, string> | null) ?? null,
      createdAt: u.createdAt,
    })),
  }));

  const activeIncidents = incidents.filter((i) => i.kind === "incident" && i.status !== "resolved");
  const maintenance = incidents
    .filter((i) => i.kind === "maintenance" && i.phase !== "completed")
    .sort((a, b) => (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0));

  const components: SnapshotComponent[] = page.components.map((c) => {
    const refs: ActiveIncidentRef[] = [
      ...activeIncidents
        .filter((i) => i.componentKeys.includes(c.key))
        .map((i) => ({ kind: "incident" as const, impact: i.impact, inProgress: true })),
      ...maintenance
        .filter((i) => i.componentKeys.includes(c.key))
        .map((i) => ({
          kind: "maintenance" as const,
          impact: i.impact,
          inProgress: i.phase === "in_progress",
        })),
    ];
    const verdict = evaluateComponent(
      c.evidence.map((e) => ({
        source: e.source,
        coverage: e.coverage,
        state: e.state,
        checkedAt: e.checkedAt,
        lastSuccessAt: e.lastSuccessAt,
        latencyMs: e.latencyMs,
        note: e.note,
        freshnessSeconds: e.freshnessSeconds,
      })),
      refs,
      now,
    );
    const byDate = new Map(c.days.map((d) => [dateKey(d.day), d]));
    const days: SnapshotDay[] = dates.map((date) => {
      const d = byDate.get(date);
      const stats = { total: d?.total ?? 0, degraded: d?.degraded ?? 0, outage: d?.outage ?? 0 };
      return {
        date,
        state: dayState(stats),
        uptime: dayUptime(stats),
        total: stats.total,
        avgLatencyMs:
          d && d.latencyCount > 0 ? Math.round(Number(d.latencySum) / d.latencyCount) : null,
      };
    });
    const measured = days.filter((d) => d.uptime !== null);
    const uptime90 =
      measured.length === 0
        ? null
        : measured.reduce((sum, d) => sum + (d.uptime ?? 0), 0) / measured.length;
    return {
      id: c.id,
      key: c.key,
      name: c.name,
      nameI18n: (c.nameI18n as Record<string, string> | null) ?? null,
      description: c.description,
      groupKey: c.group?.key ?? null,
      isPublic: c.isPublic,
      verdict,
      days,
      uptime90,
    };
  });

  return {
    page: {
      id: page.id,
      workspaceId: page.workspaceId,
      slug: page.slug,
      title: page.title,
      description: page.description,
      locales: page.locales,
      compatProfile: page.compatProfile,
    },
    generatedAt: now,
    overall: overallState(components.map((c) => c.verdict.state)),
    groups: page.groups.map((g) => ({
      key: g.key,
      name: g.name,
      nameI18n: (g.nameI18n as Record<string, string> | null) ?? null,
    })),
    components,
    activeIncidents,
    maintenance,
    recentIncidents: incidents.filter((i) => i.kind === "incident" || i.phase === "completed"),
  };
}
