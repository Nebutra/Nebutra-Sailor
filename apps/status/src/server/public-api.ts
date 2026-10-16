/**
 * The native, versioned JSON renderings of a page snapshot: the status
 * document, incidents, and the deploy gate verdict. Dates are ISO 8601 UTC.
 *
 * `version` changes only on a breaking change; fields are added freely.
 */
import type { EvidenceCoverage } from "./evaluate";
import { iso } from "./http";
import type { PageSnapshot, SnapshotComponent, SnapshotIncident } from "./snapshot";

export const STATUS_API_VERSION = 1;

export function incidentJson(i: SnapshotIncident) {
  return {
    id: i.id,
    kind: i.kind,
    title: i.title,
    impact: i.impact,
    status: i.status,
    phase: i.phase,
    scheduledStart: iso(i.scheduledStart),
    scheduledEnd: iso(i.scheduledEnd),
    resolvedAt: iso(i.resolvedAt),
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
    components: i.componentKeys,
    updates: i.updates.map((u) => ({
      status: u.status,
      message: u.message,
      messageI18n: u.messageI18n,
      createdAt: iso(u.createdAt),
    })),
  };
}

function componentJson(c: SnapshotComponent) {
  const v = c.verdict;
  return {
    key: c.key,
    name: c.name,
    nameI18n: c.nameI18n,
    description: c.description,
    group: c.groupKey,
    state: v.state,
    verified: v.verified,
    coverage: v.coverage,
    checkedAt: iso(v.checkedAt),
    lastSuccessAt: iso(v.lastSuccessAt),
    latencyMs: v.latencyMs,
    note: v.note,
    uptime90: c.uptime90,
    days: c.days.map((d) => ({
      date: d.date,
      state: d.state,
      uptime: d.uptime,
      avgLatencyMs: d.avgLatencyMs,
    })),
  };
}

export function statusJson(snapshot: PageSnapshot, pageUrl: string) {
  const publicComponents = snapshot.components.filter((c) => c.isPublic);
  return {
    version: STATUS_API_VERSION,
    page: {
      slug: snapshot.page.slug,
      title: snapshot.page.title,
      description: snapshot.page.description,
      locales: snapshot.page.locales,
      url: pageUrl,
    },
    generatedAt: iso(snapshot.generatedAt),
    overall: snapshot.overall,
    groups: snapshot.groups.map((g) => ({
      key: g.key,
      name: g.name,
      nameI18n: g.nameI18n,
      components: publicComponents.filter((c) => c.groupKey === g.key).map((c) => c.key),
    })),
    components: publicComponents.map(componentJson),
    incidents: {
      active: snapshot.activeIncidents.map(incidentJson),
      maintenance: snapshot.maintenance.map(incidentJson),
      recent: snapshot.recentIncidents.map(incidentJson),
    },
  };
}

// ── Deploy gate ─────────────────────────────────────────────────────────────

export type GateReason =
  | "verified"
  | "unknown_component"
  | "no_evidence"
  | "failing"
  | "stale"
  | "before_since";

export interface GateComponent {
  key: string;
  verified: boolean;
  checkedAt: string | null;
  reason: GateReason;
}

export interface GateResult {
  pass: boolean;
  coverage: EvidenceCoverage;
  since: string | null;
  checkedAt: string;
  components: GateComponent[];
}

/**
 * Pass only when every listed component has fresh, non-failing evidence of
 * the given coverage checked at or after `since`. Every source of that
 * coverage must agree: one green journey does not hide a red one.
 */
export function evaluateGate(
  snapshot: PageSnapshot,
  keys: string[],
  coverage: EvidenceCoverage,
  since: Date | null,
): GateResult {
  const components = keys.map((key): GateComponent => {
    const component = snapshot.components.find((c) => c.key === key);
    if (!component) return { key, verified: false, checkedAt: null, reason: "unknown_component" };
    const evidence = component.verdict.evidence.filter((e) => e.coverage === coverage);
    if (evidence.length === 0) {
      return { key, verified: false, checkedAt: null, reason: "no_evidence" };
    }
    const oldest = evidence.reduce((a, e) => (e.checkedAt < a.checkedAt ? e : a));
    const checkedAt = iso(oldest.checkedAt);
    let reason: GateReason = "verified";
    if (evidence.some((e) => e.stale)) reason = "stale";
    else if (evidence.some((e) => e.effectiveState !== "operational")) reason = "failing";
    else if (since && oldest.checkedAt < since) reason = "before_since";
    return { key, verified: reason === "verified", checkedAt, reason };
  });
  return {
    pass: components.length > 0 && components.every((c) => c.verified),
    coverage,
    since: iso(since),
    checkedAt: iso(snapshot.generatedAt) ?? new Date().toISOString(),
    components,
  };
}
