/**
 * How a component's state is decided. Pure, so every rule here is tested
 * without a database.
 *
 * The rule borrowed from 小芽's hand-built status: a component is only as
 * green as its freshest proof. Evidence that stops arriving does not keep its
 * last colour — past its freshness window it reads degraded, past twice the
 * window outage. A monitor that silently died cannot leave a page green.
 */

export type ComponentState = "operational" | "degraded" | "outage" | "maintenance" | "unknown";
export type EvidenceCoverage = "dependency" | "synthetic" | "device" | "upstream" | "manual";
export type IncidentImpact = "none" | "minor" | "major" | "critical";

export interface EvidenceReading {
  source: string;
  coverage: EvidenceCoverage;
  state: ComponentState;
  checkedAt: Date;
  lastSuccessAt: Date | null;
  latencyMs: number | null;
  note: string | null;
  freshnessSeconds: number;
}

export interface JudgedEvidence extends EvidenceReading {
  /** The state after freshness is applied. */
  effectiveState: ComponentState;
  stale: boolean;
}

export interface ActiveIncidentRef {
  kind: "incident" | "maintenance";
  impact: IncidentImpact;
  /** Maintenance only: whether its window is open now. */
  inProgress: boolean;
}

export interface ComponentVerdict {
  state: ComponentState;
  evidence: JudgedEvidence[];
  /** Fresh, non-failing synthetic evidence exists — a user journey was proven. */
  verified: boolean;
  coverage: EvidenceCoverage[];
  checkedAt: Date | null;
  lastSuccessAt: Date | null;
  latencyMs: number | null;
  note: string | null;
}

const SEVERITY: Record<ComponentState, number> = {
  operational: 0,
  maintenance: 1,
  unknown: 2,
  degraded: 3,
  outage: 4,
};

export function worst(states: ComponentState[]): ComponentState {
  return states.reduce<ComponentState>(
    (acc, s) => (SEVERITY[s] > SEVERITY[acc] ? s : acc),
    "operational",
  );
}

export function judgeEvidence(reading: EvidenceReading, now: Date): JudgedEvidence {
  const ageSeconds = (now.getTime() - reading.checkedAt.getTime()) / 1000;
  const window = Math.max(1, reading.freshnessSeconds);
  let effectiveState = reading.state;
  let stale = false;
  if (ageSeconds > 2 * window) {
    effectiveState = "outage";
    stale = true;
  } else if (ageSeconds > window) {
    effectiveState = worst([reading.state, "degraded"]);
    stale = true;
  }
  return { ...reading, effectiveState, stale };
}

function incidentFloor(incident: ActiveIncidentRef): ComponentState {
  if (incident.kind === "maintenance") return incident.inProgress ? "maintenance" : "operational";
  if (incident.impact === "critical") return "outage";
  if (incident.impact === "major" || incident.impact === "minor") return "degraded";
  return "operational";
}

/**
 * Evidence decides; a declared incident can only make it worse. Maintenance
 * in progress replaces anything short of an outage — planned work is not a
 * failure, but it does not hide one either.
 */
export function evaluateComponent(
  readings: EvidenceReading[],
  incidents: ActiveIncidentRef[],
  now: Date,
): ComponentVerdict {
  const evidence = readings.map((r) => judgeEvidence(r, now));
  const fromEvidence: ComponentState =
    evidence.length === 0 ? "unknown" : worst(evidence.map((e) => e.effectiveState));

  const declared = incidents.filter((i) => i.kind === "incident").map(incidentFloor);
  let state = worst([fromEvidence, ...declared]);

  const inMaintenance = incidents.some((i) => i.kind === "maintenance" && i.inProgress);
  if (inMaintenance && state !== "outage") state = "maintenance";

  const newest = evidence.reduce<JudgedEvidence | null>(
    (acc, e) => (!acc || e.checkedAt > acc.checkedAt ? e : acc),
    null,
  );
  const lastSuccessAt = evidence.reduce<Date | null>(
    (acc, e) => (e.lastSuccessAt && (!acc || e.lastSuccessAt > acc) ? e.lastSuccessAt : acc),
    null,
  );
  const failing = evidence.find((e) => e.effectiveState !== "operational");

  return {
    state,
    evidence,
    verified: evidence.some(
      (e) => e.coverage === "synthetic" && !e.stale && e.effectiveState === "operational",
    ),
    coverage: [...new Set(evidence.map((e) => e.coverage))],
    checkedAt: newest?.checkedAt ?? null,
    lastSuccessAt,
    latencyMs: newest?.latencyMs ?? null,
    note: failing
      ? failing.stale
        ? `No fresh reading from ${failing.source}`
        : failing.note
      : (newest?.note ?? null),
  };
}

/** Page verdict: maintenance counts as fine, unknown as degraded. */
export function overallState(states: ComponentState[]): "operational" | "degraded" | "outage" {
  if (states.includes("outage")) return "outage";
  if (states.some((s) => s === "degraded" || s === "unknown")) return "degraded";
  return "operational";
}

/** Readings per day weigh degraded at 0.3 of an outage, as @nebutra/status does. */
export function dayUptime(day: { total: number; degraded: number; outage: number }): number | null {
  if (day.total <= 0) return null;
  return Math.max(0, 1 - (day.outage + 0.3 * day.degraded) / day.total);
}

export function dayState(day: {
  total: number;
  degraded: number;
  outage: number;
}): ComponentState | "no_data" {
  if (day.total <= 0) return "no_data";
  if (day.outage / day.total >= 0.05) return "outage";
  if ((day.outage + day.degraded) / day.total >= 0.01) return "degraded";
  return "operational";
}
