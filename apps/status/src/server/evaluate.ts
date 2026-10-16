/**
 * How a component's state is decided. Pure, so every rule here is tested
 * without a database.
 *
 * A component is only as green as its fresh proof. Evidence that stops
 * arriving does not keep its last colour: past its freshness window it reads
 * `unknown`. A silent source is a gap in our monitoring, not the customer's
 * outage, so it never paints a component red on its own — outage and
 * degraded come only from fresh evidence or declared incidents. It does
 * withdraw the green: a component whose every source is silent is unknown,
 * and stale synthetic evidence never verifies a deploy.
 *
 * (Compat profiles that promised the stricter rule — 小芽's Go escalates
 * stale probes to degraded, then outage — apply it themselves.)
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
  /** The state after freshness is applied: the reading's own state while fresh, `unknown` once stale. */
  effectiveState: ComponentState;
  /** What the source last reported, fresh or not. */
  lastState: ComponentState;
  stale: boolean;
  ageSeconds: number;
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
  /** At least one source has a reading inside its freshness window. */
  hasFreshData: boolean;
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
  const ageSeconds = Math.max(0, (now.getTime() - reading.checkedAt.getTime()) / 1000);
  const stale = ageSeconds > Math.max(1, reading.freshnessSeconds);
  return {
    ...reading,
    effectiveState: stale ? "unknown" : reading.state,
    lastState: reading.state,
    stale,
    ageSeconds,
  };
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
  const fresh = evidence.filter((e) => !e.stale);
  // Judge by the sources that are still talking; with none, we do not know.
  const fromEvidence: ComponentState =
    fresh.length === 0 ? "unknown" : worst(fresh.map((e) => e.effectiveState));

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
  const failing = fresh.find((e) => e.effectiveState !== "operational");
  const silent = evidence.find((e) => e.stale);

  return {
    state,
    evidence,
    verified: evidence.some(
      (e) => e.coverage === "synthetic" && !e.stale && e.effectiveState === "operational",
    ),
    hasFreshData: fresh.length > 0,
    coverage: [...new Set(evidence.map((e) => e.coverage))],
    checkedAt: newest?.checkedAt ?? null,
    lastSuccessAt,
    latencyMs: newest?.latencyMs ?? null,
    note: failing
      ? failing.note
      : silent
        ? `No fresh reading from ${silent.source}`
        : (newest?.note ?? null),
  };
}

/**
 * Page verdict: outage or degraded only from components that are actually
 * failing; maintenance and unknown (no fresh data) count as fine here — the
 * page reports how many components it has no fresh reading for instead of
 * painting itself red over a monitoring gap.
 */
export function overallState(states: ComponentState[]): "operational" | "degraded" | "outage" {
  if (states.includes("outage")) return "outage";
  if (states.includes("degraded")) return "degraded";
  return "operational";
}

export interface PageVerdict {
  overall: "operational" | "degraded" | "outage";
  /** Components with no reading inside its freshness window, including none at all. */
  noFreshData: number;
}

export function pageVerdict(verdicts: ComponentVerdict[]): PageVerdict {
  return {
    overall: overallState(verdicts.map((v) => v.state)),
    noFreshData: verdicts.filter((v) => !v.hasFreshData).length,
  };
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
