/**
 * Tests for the markdown-canonical bitemporal typed-fact model.
 *
 * The `## Facts` fence is the system of record; every assertion here pins a
 * deterministic re-derivation from that fence. No mock libraries — pure data
 * in, pure data out, with the only clock being the injected `ctx.now`.
 */

import { describe, expect, it } from "vitest";
import type { Fact } from "./interfaces";
import {
  computeTrajectory,
  deriveFact,
  type FenceRow,
  METRIC_NORMALIZATION_MAP,
  normalizeMetric,
  parseFactsFence,
  REGRESSION_THRESHOLD,
  stripFactsFence,
  TRAJECTORY_SCHEMA_VERSION,
  type Trajectory,
} from "./temporal-facts";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const BASE_HEADER =
  "| # | claim | kind | confidence | visibility | notability | valid_from | valid_until | source | context |";
const BASE_SEP = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";

const WIDE_HEADER =
  "| # | claim | kind | confidence | visibility | notability | valid_from | valid_until | source | context | claim_metric | claim_value | claim_unit | claim_period |";
const WIDE_SEP =
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";

function canonicalDoc(rows: string[]): string {
  return [
    "# An Entity",
    "",
    "Some prose before.",
    "",
    "## Facts",
    "",
    BASE_HEADER,
    BASE_SEP,
    ...rows,
    "",
    "## Other Section",
    "",
    "Trailing prose.",
    "",
  ].join("\n");
}

function wideDoc(rows: string[]): string {
  return ["## Facts", "", WIDE_HEADER, WIDE_SEP, ...rows, ""].join("\n");
}

const CTX = {
  now: new Date("2026-05-19T12:00:00.000Z"),
  sourceId: "src_1",
  entitySlug: "an-entity",
  sourceMarkdownSlug: "an-entity",
};

// ─── parseFactsFence — canonical ────────────────────────────────────────────

describe("parseFactsFence — strict canonical", () => {
  it("parses a clean 10-column row", () => {
    const md = canonicalDoc([
      "| 1 | raised a round | event | 0.9 | world | high | 2025-01-01 | | press | seed |",
    ]);
    const { rows, warnings } = parseFactsFence(md);
    expect(warnings).toEqual([]);
    expect(rows).toHaveLength(1);
    const r = rows[0] as FenceRow;
    expect(r.rowNum).toBe(1);
    expect(r.claim).toBe("raised a round");
    expect(r.kind).toBe("event");
    expect(r.confidence).toBe(0.9);
    expect(r.visibility).toBe("world");
    expect(r.notability).toBe("high");
    expect(r.validFrom).toBe("2025-01-01");
    expect(r.validUntil).toBeUndefined();
    expect(r.source).toBe("press");
    expect(r.context).toBe("seed");
  });

  it("returns no rows and no warnings when there is no Facts section", () => {
    const { rows, warnings } = parseFactsFence("# Title\n\nNo facts here.\n");
    expect(rows).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("preserves the append-only rowNum and never renumbers", () => {
    const md = canonicalDoc([
      "| 7 | first | fact | | world | | 2025-01-01 | | s | |",
      "| 9 | second | fact | | world | | 2025-02-01 | | s | |",
    ]);
    const { rows } = parseFactsFence(md);
    expect(rows.map((r) => r.rowNum)).toEqual([7, 9]);
  });

  it("leaves optional cells undefined when blank", () => {
    const md = canonicalDoc(["| 1 | bare claim | fact | | world | | 2025-01-01 | | | |"]);
    const r = parseFactsFence(md).rows[0] as FenceRow;
    expect(r.confidence).toBeUndefined();
    expect(r.notability).toBeUndefined();
    expect(r.validUntil).toBeUndefined();
    expect(r.source).toBeUndefined();
    expect(r.context).toBeUndefined();
  });
});

// ─── parseFactsFence — lenient hand-edit ────────────────────────────────────

describe("parseFactsFence — lenient hand-edit tolerance", () => {
  it("tolerates ragged whitespace around pipes", () => {
    const md = canonicalDoc([
      "|1|  ragged claim   |event|0.5|world|low|2025-03-01||  src |  ctx |",
    ]);
    const { rows, warnings } = parseFactsFence(md);
    expect(warnings).toEqual([]);
    const r = rows[0] as FenceRow;
    expect(r.claim).toBe("ragged claim");
    expect(r.source).toBe("src");
    expect(r.context).toBe("ctx");
  });

  it("fills missing trailing cells as empty", () => {
    // Only 7 of 10 logical cells supplied — trailing source/context absent.
    const md = canonicalDoc(["| 1 | short row | fact | | world | | 2025-04-01 |"]);
    const { rows, warnings } = parseFactsFence(md);
    expect(warnings).toEqual([]);
    const r = rows[0] as FenceRow;
    expect(r.claim).toBe("short row");
    expect(r.validFrom).toBe("2025-04-01");
    expect(r.validUntil).toBeUndefined();
    expect(r.source).toBeUndefined();
    expect(r.context).toBeUndefined();
  });
});

// ─── parseFactsFence — malformed skip + warning ─────────────────────────────

describe("parseFactsFence — malformed row skip", () => {
  it("skips an unparseable # but keeps remaining rows, emitting a warning", () => {
    const md = canonicalDoc([
      "| 1 | good one | fact | | world | | 2025-01-01 | | | |",
      "| abc | bad rownum | fact | | world | | 2025-02-01 | | | |",
      "| 3 | good two | fact | | world | | 2025-03-01 | | | |",
    ]);
    const { rows, warnings } = parseFactsFence(md);
    expect(rows.map((r) => r.rowNum)).toEqual([1, 3]);
    expect(warnings.some((w) => w.includes("FACTS_TABLE_MALFORMED"))).toBe(true);
    expect(warnings).toHaveLength(1);
  });

  it("skips a row with too many cells that cannot be leniently repaired", () => {
    const md = canonicalDoc([
      "| 1 | good | fact | | world | | 2025-01-01 | | | |",
      "| 2 | a | b | c | d | e | f | g | h | i | j | k | l | m | n | o |",
    ]);
    const { rows, warnings } = parseFactsFence(md);
    expect(rows.map((r) => r.rowNum)).toEqual([1]);
    expect(warnings.some((w) => w.includes("FACTS_TABLE_MALFORMED"))).toBe(true);
  });
});

// ─── parseFactsFence — 10 → 14 column widening ──────────────────────────────

describe("parseFactsFence — typed-metric column widening", () => {
  it("detects the 14-column wide header and populates typed metric cells", () => {
    const md = wideDoc([
      "| 1 | MRR grew | fact | 0.8 | world | high | 2025-01-01 | | finance | quarterly | MRR | 120000 | usd | monthly |",
    ]);
    const { rows, warnings } = parseFactsFence(md);
    expect(warnings).toEqual([]);
    const r = rows[0] as FenceRow;
    expect(r.claimMetric).toBe("MRR");
    expect(r.claimValue).toBe("120000");
    expect(r.claimUnit).toBe("usd");
    expect(r.claimPeriod).toBe("monthly");
  });

  it("leaves typed cells undefined on a 10-column (narrow) table", () => {
    const md = canonicalDoc(["| 1 | untyped | fact | | world | | 2025-01-01 | | | |"]);
    const r = parseFactsFence(md).rows[0] as FenceRow;
    expect(r.claimMetric).toBeUndefined();
    expect(r.claimValue).toBeUndefined();
    expect(r.claimUnit).toBeUndefined();
    expect(r.claimPeriod).toBeUndefined();
  });
});

// ─── parseFactsFence — strikethrough supersession + forgotten ───────────────

describe("parseFactsFence — supersession and forgotten markers", () => {
  it("derives supersededBy from a strikethrough claim + 'superseded by #N'", () => {
    const md = canonicalDoc([
      "| 1 | ~~old claim~~ | fact | | world | | 2025-01-01 | | s | superseded by #4 |",
    ]);
    const r = parseFactsFence(md).rows[0] as FenceRow;
    expect(r.supersededBy).toBe(4);
    expect(r.claim).toBe("old claim");
  });

  it("does not set supersededBy without both strikethrough and context phrase", () => {
    const md = canonicalDoc([
      "| 1 | ~~struck only~~ | fact | | world | | 2025-01-01 | | s | just a note |",
      "| 2 | plain claim | fact | | world | | 2025-02-01 | | s | superseded by #9 |",
    ]);
    const { rows } = parseFactsFence(md);
    expect((rows[0] as FenceRow).supersededBy).toBeUndefined();
    expect((rows[1] as FenceRow).supersededBy).toBeUndefined();
  });

  it("sets forgotten=true when context contains 'forgotten:'", () => {
    const md = canonicalDoc([
      "| 1 | stale | fact | | world | | 2025-01-01 | | s | forgotten: no longer true |",
      "| 2 | live | fact | | world | | 2025-02-01 | | s | |",
    ]);
    const { rows } = parseFactsFence(md);
    expect((rows[0] as FenceRow).forgotten).toBe(true);
    expect((rows[1] as FenceRow).forgotten).toBe(false);
  });
});

// ─── deriveFact — valid_from precedence ─────────────────────────────────────

describe("deriveFact — valid_from precedence", () => {
  const row = (overrides: Partial<FenceRow> = {}): FenceRow =>
    parseFactsFence(
      canonicalDoc(["| 1 | c | fact | | world | | __VF__ | | s | |"]).replace(
        "__VF__",
        overrides.validFrom ?? "",
      ),
    ).rows[0] as FenceRow;

  it("prefers an explicit fence valid_from over everything", () => {
    const f = deriveFact(row({ validFrom: "2024-12-31" }), {
      ...CTX,
      pageEffectiveDate: "2025-06-01",
    });
    expect(f.validFrom).toBe("2024-12-31");
  });

  it("falls back to pageEffectiveDate when fence valid_from is blank", () => {
    const f = deriveFact(row(), { ...CTX, pageEffectiveDate: "2025-06-01" });
    expect(f.validFrom).toBe("2025-06-01");
  });

  it("falls back to now() (ISO date) when neither fence nor page date present", () => {
    const f = deriveFact(row(), CTX);
    expect(f.validFrom).toBe("2026-05-19");
  });
});

// ─── deriveFact — valid_until branches ──────────────────────────────────────

describe("deriveFact — valid_until branches", () => {
  it("uses an explicit fence valid_until verbatim", () => {
    const r = parseFactsFence(
      canonicalDoc(["| 1 | c | fact | | world | | 2025-01-01 | 2025-09-09 | s | |"]),
    ).rows[0] as FenceRow;
    const f = deriveFact(r, CTX);
    expect(f.validUntil).toBe("2025-09-09");
  });

  it("sets valid_until = today when the row is forgotten (no explicit value)", () => {
    const r = parseFactsFence(
      canonicalDoc(["| 1 | c | fact | | world | | 2025-01-01 | | s | forgotten: gone |"]),
    ).rows[0] as FenceRow;
    const f = deriveFact(r, CTX);
    // Re-derivation invariant: a later DB rule expired_at = valid_until must
    // land on this exact ISO date deterministically.
    expect(f.validUntil).toBe("2026-05-19");
  });

  it("leaves valid_until undefined for a live, recognized fact", () => {
    const r = parseFactsFence(canonicalDoc(["| 1 | c | fact | | world | | 2025-01-01 | | s | |"]))
      .rows[0] as FenceRow;
    const f = deriveFact(r, CTX);
    expect(f.validUntil).toBeUndefined();
  });

  it("sets valid_until = today for an unrecognized-inactive kind", () => {
    const r = parseFactsFence(
      canonicalDoc(["| 1 | c | gibberish | | world | | 2025-01-01 | | s | |"]),
    ).rows[0] as FenceRow;
    const f = deriveFact(r, CTX);
    expect(f.validUntil).toBe("2026-05-19");
  });
});

// ─── deriveFact — typed-metric population + shape ───────────────────────────

describe("deriveFact — typed-metric population", () => {
  it("populates numeric claimValue and normalizes the metric", () => {
    const r = parseFactsFence(
      wideDoc([
        "| 1 | MRR is up | fact | 0.7 | world | medium | 2025-01-01 | | fin | q | MRR | 120000 | usd | monthly |",
      ]),
    ).rows[0] as FenceRow;
    const f = deriveFact(r, CTX);
    expect(f.claimMetric).toBe("mrr");
    expect(f.claimValue).toBe(120000);
    expect(typeof f.claimValue).toBe("number");
    expect(f.claimUnit).toBe("usd");
    expect(f.claimPeriod).toBe("monthly");
  });

  it("maps fence fields onto the Fact contract and stays free of metric cells when untyped", () => {
    const r = parseFactsFence(
      canonicalDoc([
        "| 5 | a claim | preference | 0.4 | private | low | 2025-01-01 | | s | note |",
      ]),
    ).rows[0] as FenceRow;
    const f: Fact = deriveFact(r, CTX);
    expect(f.sourceId).toBe("src_1");
    expect(f.entitySlug).toBe("an-entity");
    expect(f.sourceMarkdownSlug).toBe("an-entity");
    expect(f.rowNum).toBe(5);
    expect(f.kind).toBe("preference");
    expect(f.visibility).toBe("private");
    expect(f.confidence).toBe(0.4);
    expect(f.notability).toBe("low");
    expect(f.claimMetric).toBeUndefined();
    expect(f.claimValue).toBeUndefined();
    expect(f.forgotten).toBe(false);
    expect(f.supersededBy).toBeUndefined();
    expect(f.id).toBeUndefined();
    // exactOptionalPropertyTypes: optional keys may be omitted entirely.
    expect("claimValue" in f).toBe(true);
  });
});

// ─── normalizeMetric ────────────────────────────────────────────────────────

describe("normalizeMetric", () => {
  it("exports a seed map covering common SaaS metrics", () => {
    expect(METRIC_NORMALIZATION_MAP.mrr).toBeDefined();
    expect(METRIC_NORMALIZATION_MAP.arr).toBeDefined();
    expect(METRIC_NORMALIZATION_MAP.burn_rate).toBeDefined();
    expect(METRIC_NORMALIZATION_MAP.team_size).toBeDefined();
    expect(METRIC_NORMALIZATION_MAP.runway_months).toBeDefined();
    expect(METRIC_NORMALIZATION_MAP.headcount).toBeDefined();
  });

  it("normalizes seed aliases case-insensitively", () => {
    expect(normalizeMetric("MRR")).toBe(normalizeMetric("mrr"));
    expect(normalizeMetric("  ARR  ")).toBe(METRIC_NORMALIZATION_MAP.arr);
  });

  it("falls back to lowercase snake_case for unseen metrics", () => {
    expect(normalizeMetric("Net Revenue Retention")).toBe("net_revenue_retention");
    expect(normalizeMetric("Daily-Active Users")).toBe("daily_active_users");
    expect(normalizeMetric("CAC")).toBe("cac");
  });
});

// ─── stripFactsFence ────────────────────────────────────────────────────────

describe("stripFactsFence — deny-by-default", () => {
  it("removes the entire ## Facts fence when no keepVisibility is given", () => {
    const md = canonicalDoc([
      "| 1 | secret | fact | | private | | 2025-01-01 | | s | |",
      "| 2 | public | fact | | world | | 2025-02-01 | | s | |",
    ]);
    const out = stripFactsFence(md);
    expect(out).not.toContain("## Facts");
    expect(out).not.toContain("secret");
    expect(out).not.toContain("public");
    expect(out).toContain("# An Entity");
    expect(out).toContain("Some prose before.");
    expect(out).toContain("## Other Section");
    expect(out).toContain("Trailing prose.");
  });

  it("keeps the fence but drops non-world rows when keepVisibility='world'", () => {
    const md = canonicalDoc([
      "| 1 | secret | fact | | private | | 2025-01-01 | | s | |",
      "| 2 | public | fact | | world | | 2025-02-01 | | s | |",
    ]);
    const out = stripFactsFence(md, { keepVisibility: "world" });
    expect(out).toContain("## Facts");
    expect(out).toContain("public");
    expect(out).not.toContain("secret");
    expect(out).toContain("## Other Section");
  });

  it("leaves markdown without a Facts fence untouched", () => {
    const md = "# Title\n\nJust prose, no fence.\n";
    expect(stripFactsFence(md)).toBe(md);
    expect(stripFactsFence(md, { keepVisibility: "world" })).toBe(md);
  });
});

// ─── computeTrajectory ──────────────────────────────────────────────────────

function metricFact(metric: string, value: number, validFrom: string): Fact {
  return {
    id: undefined,
    sourceId: "s",
    entitySlug: "e",
    claim: `${metric}=${value}`,
    kind: "fact",
    confidence: undefined,
    visibility: "world",
    notability: undefined,
    validFrom,
    validUntil: undefined,
    claimMetric: metric,
    claimValue: value,
    claimUnit: undefined,
    claimPeriod: undefined,
    rowNum: 1,
    sourceMarkdownSlug: "e",
    supersededBy: undefined,
    forgotten: false,
  };
}

describe("computeTrajectory", () => {
  it("carries the stable additive schemaVersion", () => {
    const t: Trajectory = computeTrajectory([]);
    expect(t.schemaVersion).toBe(TRAJECTORY_SCHEMA_VERSION);
    expect(TRAJECTORY_SCHEMA_VERSION).toBe(1);
  });

  it("ignores facts with no claimMetric", () => {
    const noMetric: Fact = { ...metricFact("mrr", 1, "2025-01-01"), claimMetric: undefined };
    const t = computeTrajectory([noMetric]);
    expect(t.metrics).toEqual([]);
  });

  it("flags a regression when the drop exceeds the default threshold", () => {
    const facts = [
      metricFact("mrr", 100000, "2025-01-01"),
      metricFact("mrr", 80000, "2025-02-01"), // -20% ⇒ regression
    ];
    const t = computeTrajectory(facts);
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    expect(mrr).toBeDefined();
    expect(mrr?.regressions.length).toBeGreaterThan(0);
  });

  it("does not flag a regression for a drop within the threshold", () => {
    const facts = [
      metricFact("mrr", 100000, "2025-01-01"),
      metricFact("mrr", 95000, "2025-02-01"), // -5% < 10%
    ];
    const t = computeTrajectory(facts);
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    expect(mrr?.regressions).toEqual([]);
  });

  it("respects a custom regressionThreshold", () => {
    const facts = [
      metricFact("mrr", 100, "2025-01-01"),
      metricFact("mrr", 97, "2025-02-01"), // -3%
    ];
    const t = computeTrajectory(facts, { regressionThreshold: 0.02 });
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    expect(mrr?.regressions.length).toBeGreaterThan(0);
  });

  it("guards older===0 so it never divides by zero (no regression)", () => {
    const facts = [metricFact("mrr", 0, "2025-01-01"), metricFact("mrr", 50000, "2025-02-01")];
    const t = computeTrajectory(facts);
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    expect(mrr?.regressions).toEqual([]);
  });

  it("exposes the default REGRESSION_THRESHOLD constant", () => {
    expect(REGRESSION_THRESHOLD).toBe(0.1);
  });

  it("returns driftScore=null with fewer than 3 embedded points", () => {
    const facts = [metricFact("mrr", 100, "2025-01-01"), metricFact("mrr", 110, "2025-02-01")];
    const embeddings = new Map<string, number[]>([
      [facts[0]!.claim, [1, 0, 0]],
      [facts[1]!.claim, [0, 1, 0]],
    ]);
    const t = computeTrajectory(facts, { embeddings });
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    expect(mrr?.driftScore).toBeNull();
  });

  it("computes a clamped driftScore in [0,1] with >=3 embedded points", () => {
    const facts = [
      metricFact("mrr", 100, "2025-01-01"),
      metricFact("mrr", 110, "2025-02-01"),
      metricFact("mrr", 120, "2025-03-01"),
    ];
    const embeddings = new Map<string, number[]>([
      [facts[0]!.claim, [1, 0, 0]],
      [facts[1]!.claim, [0, 1, 0]],
      [facts[2]!.claim, [0, 0, 1]],
    ]);
    const t = computeTrajectory(facts, { embeddings });
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    expect(mrr?.driftScore).not.toBeNull();
    expect(mrr!.driftScore as number).toBeGreaterThanOrEqual(0);
    expect(mrr!.driftScore as number).toBeLessThanOrEqual(1);
    // Orthogonal vectors ⇒ cosine 0 ⇒ drift clamps to 1.
    expect(mrr!.driftScore).toBe(1);
  });

  it("sorts chronologically by validFrom regardless of input order", () => {
    const facts = [
      metricFact("mrr", 80000, "2025-03-01"),
      metricFact("mrr", 100000, "2025-01-01"),
      metricFact("mrr", 90000, "2025-02-01"),
    ];
    const t = computeTrajectory(facts);
    const mrr = t.metrics.find((m) => m.metric === "mrr");
    // 100k → 90k (-10%, regression at default) → 80k (-11.1%, regression).
    expect(mrr?.regressions.length).toBeGreaterThanOrEqual(1);
  });
});
