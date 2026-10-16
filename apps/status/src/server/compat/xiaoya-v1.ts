/**
 * Compat profile `xiaoya-v1`: the JSON 小芽's Go API served at
 * `/api/v1/status` (`PublicStatusResp`, internal/ops/status.go), byte for
 * byte, so its release script keeps gating on it unchanged.
 *
 * What has to match, and why:
 *  - Key order and `omitempty`: Go's encoding/json writes struct fields in
 *    declaration order and drops empty `omitempty` fields (`latency_ms` when 0,
 *    the verification's `status` / `checked_at` / `last_success_at` /
 *    `latency_ms` when empty).
 *  - Times: `time.RFC3339` on a UTC time — second precision, `Z` suffix. The
 *    deploy script compares `checked_at >= $started` as strings, and `$started`
 *    comes from `date -u +%Y-%m-%dT%H:%M:%SZ`; milliseconds would break the
 *    lexical order on the same second.
 *  - Three states only. 小芽 has no maintenance or unknown on the public page:
 *    unknown dependencies render as degraded (depStatusToPublic), and so does
 *    maintenance here — planned work is not "operational" to a release gate.
 *  - `verification`: every first-party component carries one. `synthetic` when
 *    the component has synthetic evidence, else `{coverage:"dependency_only",
 *    verified:false}` — the shape ApplyBusinessProbeEvidence produces.
 *    `verified` means status operational and a last success on record.
 *  - HTML-safe escaping of `<`, `>`, `&`, U+2028 and U+2029, as Go's encoder
 *    does by default.
 */
import type { ComponentState, JudgedEvidence } from "../evaluate";
import type { PageSnapshot, SnapshotComponent, SnapshotIncident } from "../snapshot";

export type XiaoyaLevel = "operational" | "degraded" | "outage";

export interface XiaoyaVerification {
  coverage: "synthetic" | "dependency_only";
  verified: boolean;
  status?: XiaoyaLevel;
  checked_at?: string;
  last_success_at?: string;
  latency_ms?: number;
}

export interface XiaoyaComponent {
  id: string;
  name: string;
  description: string;
  status: XiaoyaLevel;
  latency_ms?: number;
  updated_at: string;
  verification?: XiaoyaVerification;
}

export interface XiaoyaStatus {
  page: { name: string; url: string; description: string };
  overall: XiaoyaLevel;
  components: XiaoyaComponent[];
  groups: Array<{ id: string; name: string; description: string; components: XiaoyaComponent[] }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    updated_at: string;
    message: string;
  }>;
  updated_at: string;
}

/** Go's `t.UTC().Format(time.RFC3339)`: truncated to the second, `Z`. */
export function rfc3339(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

export function toXiaoyaLevel(state: ComponentState): XiaoyaLevel {
  if (state === "operational" || state === "outage") return state;
  return "degraded";
}

function worstLevel(levels: XiaoyaLevel[]): XiaoyaLevel {
  if (levels.includes("outage")) return "outage";
  if (levels.includes("degraded")) return "degraded";
  return "operational";
}

/**
 * Several synthetic sources on one component are judged together: the
 * oldest check and oldest success stand for all of them, so a gate on
 * `checked_at` passes only once every journey has run again.
 */
function syntheticVerification(evidence: JudgedEvidence[]): XiaoyaVerification | null {
  const synthetic = evidence.filter((e) => e.coverage === "synthetic");
  if (synthetic.length === 0) return null;
  const status = worstLevel(synthetic.map((e) => toXiaoyaLevel(e.effectiveState)));
  const checkedAt = synthetic.reduce(
    (a, e) => (e.checkedAt < a ? e.checkedAt : a),
    synthetic[0]!.checkedAt,
  );
  const successes = synthetic.map((e) => e.lastSuccessAt);
  const lastSuccessAt = successes.every((d): d is Date => d !== null)
    ? successes.reduce((a, d) => (d < a ? d : a))
    : null;
  const latency = Math.max(0, ...synthetic.map((e) => e.latencyMs ?? 0));
  const v: XiaoyaVerification = {
    coverage: "synthetic",
    verified: status === "operational" && lastSuccessAt !== null,
    status,
    checked_at: rfc3339(checkedAt),
  };
  if (lastSuccessAt) v.last_success_at = rfc3339(lastSuccessAt);
  if (latency > 0) v.latency_ms = latency;
  return v;
}

function component(c: SnapshotComponent, now: Date): XiaoyaComponent {
  const verification = syntheticVerification(c.verdict.evidence) ?? {
    coverage: "dependency_only" as const,
    verified: false,
  };
  const latency =
    (verification.latency_ms ?? 0) > 0 ? verification.latency_ms : (c.verdict.latencyMs ?? 0);
  const updated =
    verification.checked_at ?? (c.verdict.checkedAt ? rfc3339(c.verdict.checkedAt) : rfc3339(now));
  // Spread in declaration order: JSON key order is part of the contract.
  return {
    id: c.key,
    name: c.name,
    description: c.description ?? "",
    status: toXiaoyaLevel(c.verdict.state),
    ...(latency && latency > 0 ? { latency_ms: latency } : {}),
    updated_at: updated,
    verification,
  };
}

function incidentImpact(i: SnapshotIncident): string {
  if (i.kind === "maintenance") return "maintenance";
  if (i.impact === "critical") return "outage";
  if (i.impact === "none") return "none";
  return "degraded";
}

function incident(i: SnapshotIncident) {
  const last = i.updates.at(-1);
  return {
    id: i.id,
    title: i.title,
    status: i.kind === "maintenance" ? "in_progress" : i.status,
    impact: incidentImpact(i),
    updated_at: rfc3339(i.updatedAt),
    message: last?.message ?? "",
  };
}

export function buildXiaoyaStatus(snapshot: PageSnapshot, pageUrl: string): XiaoyaStatus {
  const now = snapshot.generatedAt;
  const published = snapshot.components.filter((c) => c.isPublic);
  const components = published.map((c) => component(c, now));
  const byKey = new Map(published.map((c, i) => [c.key, components[i]!]));
  const groups = snapshot.groups
    .map((g) => ({
      id: g.key,
      name: g.name,
      description: g.description ?? "",
      components: published.filter((c) => c.groupKey === g.key).map((c) => byKey.get(c.key)!),
    }))
    .filter((g) => g.components.length > 0);
  return {
    page: {
      name: snapshot.page.title,
      url: pageUrl,
      description: snapshot.page.description ?? "",
    },
    overall: worstLevel(components.map((c) => c.status)),
    components,
    groups,
    incidents: [
      ...snapshot.activeIncidents,
      ...snapshot.maintenance.filter((m) => m.phase === "in_progress"),
    ].map(incident),
    updated_at: rfc3339(now),
  };
}

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** `json.Marshal` output: compact, HTML-safe escaped. */
export function marshalGo(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replaceAll(LINE_SEPARATOR, "\\u2028")
    .replaceAll(PARAGRAPH_SEPARATOR, "\\u2029");
}

export function xiaoyaResponse(snapshot: PageSnapshot, pageUrl: string): Response {
  return new Response(marshalGo(buildXiaoyaStatus(snapshot, pageUrl)), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The release gate polls once a second for fresh evidence.
      "cache-control": "no-cache",
    },
  });
}
