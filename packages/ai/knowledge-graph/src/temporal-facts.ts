/**
 * Markdown-canonical bitemporal typed-fact model.
 *
 * ── Markdown is the system of record ────────────────────────────────────────
 * The `## Facts` markdown table fence is canonical. A {@link Fact} row is its
 * *derived* form and must be fully, deterministically re-derivable from the
 * fence alone — re-deriving from unchanged fence text is a true no-op. Nothing
 * here reads a clock, the filesystem, the network, or a datastore: the only
 * time source is the injected `ctx.now`, so a given (fence, ctx) pair always
 * yields the same fact, forever.
 *
 * ── Stable, append-only row identity ────────────────────────────────────────
 * The `#` column is the append-only `rowNum`. It is NEVER renumbered, so
 * cross-page references stay stable across edits. A row whose `#` cannot be
 * parsed is skipped (with a warning) rather than re-indexed.
 *
 * ── Schema widening without churn ───────────────────────────────────────────
 * The base table is 10 columns. It widens to 14 (appending
 * `claim_metric | claim_value | claim_unit | claim_period`) ONLY for corpora
 * that actually carry a typed metric — detected by header width. Untyped
 * corpora keep the narrow table so a typed row landing elsewhere never forces
 * a churn diff on unrelated pages.
 *
 * ── The forgotten ⇒ valid_until=today re-derivation invariant ───────────────
 * When a row is `forgotten` (or its kind is unrecognized-inactive) and carries
 * no explicit `valid_until`, {@link deriveFact} stamps `validUntil` to the ISO
 * date of `ctx.now`. This is deliberately the *same* value a downstream store
 * rule `expired_at = valid_until` would compute, so the DB projection and the
 * markdown re-derivation can never disagree. The value is an ISO *date*
 * (`YYYY-MM-DD`), not a timestamp, so it is stable within a day.
 *
 * ── Deny-by-default visibility ──────────────────────────────────────────────
 * {@link stripFactsFence} removes the ENTIRE fence unless the caller opts into
 * a visibility band. The chunker / remote path therefore cannot leak a private
 * row by forgetting an option — silence fails closed, not open.
 *
 * ── Additive-only contracts ─────────────────────────────────────────────────
 * {@link Trajectory} carries {@link TRAJECTORY_SCHEMA_VERSION}. The shape is
 * append-only: consumers may rely on existing fields and must tolerate new
 * ones; the version bumps only on a breaking change (none yet ⇒ `1`).
 */

import { clamp } from "@nebutra/ai-primitives";

import { z } from "zod";
import {
  cosineSimilarity,
  type Fact,
  type FactKind,
  type Notability,
  type Visibility,
} from "./interfaces";

// ─── Public input schemas (validated at the package boundary) ───────────────

/** The set of kinds recognized as *active* — anything else is inactive. */
const RECOGNIZED_KINDS: ReadonlySet<FactKind> = new Set<FactKind>([
  "event",
  "preference",
  "commitment",
  "belief",
  "fact",
]);

const markdownSchema = z
  .string({ message: "markdown must be a string" })
  .max(5_000_000, "markdown is implausibly large (fail-closed)");

const visibilitySchema: z.ZodType<Visibility> = z.enum(["private", "world"]);

const deriveCtxSchema = z.object({
  pageEffectiveDate: z.string().trim().min(1).optional(),
  now: z.date(),
  sourceId: z.string().trim().min(1, "sourceId is required (fail-closed)"),
  entitySlug: z.string().trim().min(1, "entitySlug is required (fail-closed)"),
  sourceMarkdownSlug: z.string().trim().min(1, "sourceMarkdownSlug is required (fail-closed)"),
});

/** Context for {@link deriveFact} — `now` is the ONLY clock in this module. */
export type DeriveContext = z.infer<typeof deriveCtxSchema>;

// ─── FenceRow — the parsed-but-not-yet-derived fence line ───────────────────

/**
 * One parsed `## Facts` row. This is the faithful transcription of the fence
 * cells (string-typed, pre-derivation). {@link deriveFact} turns it into a
 * {@link Fact}. `claimValue` is intentionally still a string here — the
 * numeric coercion is a derivation concern, not a parse concern.
 */
export interface FenceRow {
  readonly rowNum: number;
  readonly claim: string;
  readonly kind: string;
  readonly confidence: number | undefined;
  readonly visibility: Visibility;
  readonly notability: Notability | undefined;
  readonly validFrom: string | undefined;
  readonly validUntil: string | undefined;
  readonly source: string | undefined;
  readonly context: string | undefined;
  readonly claimMetric: string | undefined;
  readonly claimValue: string | undefined;
  readonly claimUnit: string | undefined;
  readonly claimPeriod: string | undefined;
  readonly supersededBy: number | undefined;
  readonly forgotten: boolean;
}

// ─── Trajectory — the additive-only metric-evolution contract ───────────────

/** Stable, append-only schema version for {@link Trajectory}. */
export const TRAJECTORY_SCHEMA_VERSION = 1 as const;

/** Default relative-drop threshold below which no regression fires. */
export const REGRESSION_THRESHOLD = 0.1 as const;

/** A point where a metric dropped by at least the active threshold. */
export interface RegressionPoint {
  readonly from: number;
  readonly to: number;
  readonly fromDate: string;
  readonly toDate: string;
  readonly relativeChange: number;
}

/** The evolution of a single typed metric over chronological facts. */
export interface MetricTrajectory {
  readonly metric: string;
  readonly points: ReadonlyArray<{ value: number; validFrom: string }>;
  readonly regressions: readonly RegressionPoint[];
  /** Semantic drift in [0,1], or `null` with <3 embedded points. */
  readonly driftScore: number | null;
}

/** The full trajectory across every typed metric. Additive-only. */
export interface Trajectory {
  readonly schemaVersion: typeof TRAJECTORY_SCHEMA_VERSION;
  readonly metrics: readonly MetricTrajectory[];
}

// ─── Metric normalization ───────────────────────────────────────────────────

/**
 * Seed alias → canonical-metric map. This is a *seed*, not an exhaustive
 * registry: {@link normalizeMetric} falls back to lowercase snake_case so an
 * unseen metric normalizes deterministically without a code change.
 */
export const METRIC_NORMALIZATION_MAP: Readonly<Record<string, string>> = Object.freeze({
  mrr: "mrr",
  "monthly recurring revenue": "mrr",
  arr: "arr",
  "annual recurring revenue": "arr",
  burn: "burn_rate",
  burn_rate: "burn_rate",
  "burn rate": "burn_rate",
  team_size: "team_size",
  "team size": "team_size",
  teamsize: "team_size",
  runway: "runway_months",
  runway_months: "runway_months",
  "runway months": "runway_months",
  headcount: "headcount",
  "head count": "headcount",
  employees: "headcount",
});

/**
 * Normalize a raw metric label to a canonical key. Seed aliases win; anything
 * unseen falls back to a lowercase snake_case slug so arbitrary metrics still
 * normalize stably.
 */
export function normalizeMetric(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const seeded = METRIC_NORMALIZATION_MAP[lower];
  if (seeded !== undefined) return seeded;
  return lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// ─── Fence parsing ──────────────────────────────────────────────────────────

const BASE_COLUMN_COUNT = 10;
const WIDE_COLUMN_COUNT = 14;
const MALFORMED_WARNING = "FACTS_TABLE_MALFORMED";

/** Split one markdown table line into trimmed cells (outer pipes dropped). */
function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((c) => c.trim());
}

/** A line is a separator row (`| --- | --- |`) — skipped, not data. */
function isSeparator(cells: readonly string[]): boolean {
  return cells.every((c) => /^:?-{1,}:?$/.test(c) || c === "");
}

function emptyToUndefined(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function parseVisibility(raw: string | undefined): Visibility {
  return raw?.trim().toLowerCase() === "world" ? "world" : "private";
}

function parseNotability(raw: string | undefined): Notability | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseConfidence(raw: string | undefined): number | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Strip a `~~strikethrough~~` wrapper, returning the inner text plus whether
 * the claim was struck.
 */
function unstrike(claim: string): { text: string; struck: boolean } {
  const m = /^~~(.*)~~$/.exec(claim.trim());
  if (m) return { text: (m[1] ?? "").trim(), struck: true };
  return { text: claim.trim(), struck: false };
}

/**
 * Locate the `## Facts` section and return its line range + the table lines.
 * Returns `undefined` when there is no such section.
 */
function locateFactsSection(
  lines: readonly string[],
): { start: number; end: number; tableLines: string[] } | undefined {
  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+Facts\s*$/.test((lines[i] ?? "").trim())) {
      headingIdx = i;
      break;
    }
  }
  if (headingIdx === -1) return undefined;

  // The fence runs from the heading until the next heading of equal/higher
  // level (## or #) or end of document.
  let end = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (/^#{1,2}\s+\S/.test((lines[i] ?? "").trim())) {
      end = i;
      break;
    }
  }
  const tableLines = lines.slice(headingIdx + 1, end).filter((l) => l.trim().startsWith("|"));
  return { start: headingIdx, end, tableLines };
}

/**
 * Parse the `## Facts` fence. Two tolerances:
 *  - strict-canonical: exact pipe table;
 *  - lenient-hand-edit: ragged whitespace, missing trailing cells filled empty.
 *
 * A row whose cell count cannot be leniently repaired, or whose `#` is
 * unparseable, is SKIPPED with a single {@link MALFORMED_WARNING} string;
 * surviving rows still parse.
 */
export function parseFactsFence(markdown: string): {
  rows: FenceRow[];
  warnings: string[];
} {
  const md = markdownSchema.parse(markdown);
  const located = locateFactsSection(md.split("\n"));
  if (!located || located.tableLines.length === 0) {
    return { rows: [], warnings: [] };
  }

  const dataLines: string[][] = [];
  for (const line of located.tableLines) {
    const cells = splitRow(line);
    if (isSeparator(cells)) continue;
    dataLines.push(cells);
  }
  if (dataLines.length === 0) return { rows: [], warnings: [] };

  // First data line is the header — its width selects narrow vs wide.
  const header = dataLines[0] as string[];
  const headerLooksLikeHeader = /(^|\s)#($|\s)|claim/i.test(header.join(" "));
  const bodyLines = headerLooksLikeHeader ? dataLines.slice(1) : dataLines;
  const wide = header.length >= WIDE_COLUMN_COUNT;
  const expected = wide ? WIDE_COLUMN_COUNT : BASE_COLUMN_COUNT;

  const rows: FenceRow[] = [];
  const warnings: string[] = [];
  let malformedSeen = false;

  for (const cells of bodyLines) {
    let normalized = cells;
    if (cells.length < expected) {
      // Lenient: pad missing trailing cells as empty.
      normalized = [...cells, ...Array(expected - cells.length).fill("")];
    } else if (cells.length > expected) {
      // Cannot leniently repair an over-wide row — skip it.
      if (!malformedSeen) {
        warnings.push(`${MALFORMED_WARNING}: row has ${cells.length} cells, expected ${expected}`);
        malformedSeen = true;
      }
      continue;
    }

    const rawNum = (normalized[0] ?? "").trim();
    const rowNum = Number.parseInt(rawNum, 10);
    if (!/^\d+$/.test(rawNum) || !Number.isFinite(rowNum)) {
      if (!malformedSeen) {
        warnings.push(`${MALFORMED_WARNING}: unparseable row number "${rawNum}"`);
        malformedSeen = true;
      }
      continue;
    }

    const rawClaim = normalized[1] ?? "";
    const { text: claimText, struck } = unstrike(rawClaim);
    const context = emptyToUndefined(normalized[9]);

    const supersedeMatch = context ? /superseded by #(\d+)/i.exec(context) : null;
    const supersededBy =
      struck && supersedeMatch ? Number.parseInt(supersedeMatch[1] as string, 10) : undefined;
    const forgotten = context ? /forgotten:/i.test(context) : false;

    rows.push({
      rowNum,
      claim: claimText,
      kind: (normalized[2] ?? "").trim(),
      confidence: parseConfidence(normalized[3]),
      visibility: parseVisibility(normalized[4]),
      notability: parseNotability(normalized[5]),
      validFrom: emptyToUndefined(normalized[6]),
      validUntil: emptyToUndefined(normalized[7]),
      source: emptyToUndefined(normalized[8]),
      context,
      claimMetric: wide ? emptyToUndefined(normalized[10]) : undefined,
      claimValue: wide ? emptyToUndefined(normalized[11]) : undefined,
      claimUnit: wide ? emptyToUndefined(normalized[12]) : undefined,
      claimPeriod: wide ? emptyToUndefined(normalized[13]) : undefined,
      supersededBy,
      forgotten,
    });
  }

  return { rows, warnings };
}

// ─── Fact derivation ────────────────────────────────────────────────────────

/** ISO date (`YYYY-MM-DD`) of a Date — UTC, stable within a calendar day. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Derive a {@link Fact} from a parsed {@link FenceRow}.
 *
 * `validFrom` precedence: explicit fence value > `pageEffectiveDate` > the ISO
 * date of `ctx.now`.
 *
 * `validUntil`: explicit fence value > (if `forgotten` OR the kind is
 * unrecognized-inactive ⇒ the ISO date of `ctx.now`) > `undefined`. The
 * forgotten ⇒ today rule is the re-derivation invariant: a later store rule
 * `expired_at = valid_until` lands on this exact date.
 *
 * Optionals are built conditionally (`exactOptionalPropertyTypes`): an absent
 * value is the key carrying `undefined`, never a separate "missing" state.
 */
export function deriveFact(row: FenceRow, ctx: DeriveContext): Fact {
  const c = deriveCtxSchema.parse(ctx);
  const nowIso = isoDate(c.now);

  const validFrom = row.validFrom ?? c.pageEffectiveDate ?? nowIso;

  const kindRecognized = RECOGNIZED_KINDS.has(row.kind as FactKind);
  const validUntil: string | undefined =
    row.validUntil ?? (row.forgotten || !kindRecognized ? nowIso : undefined);

  const kind: FactKind = kindRecognized ? (row.kind as FactKind) : "fact";

  const rawValue = row.claimValue !== undefined ? Number(row.claimValue) : undefined;
  const claimValue = rawValue !== undefined && Number.isFinite(rawValue) ? rawValue : undefined;
  const claimMetric = row.claimMetric !== undefined ? normalizeMetric(row.claimMetric) : undefined;

  return {
    id: undefined,
    sourceId: c.sourceId,
    entitySlug: c.entitySlug,
    claim: row.claim,
    kind,
    confidence: row.confidence,
    visibility: row.visibility,
    notability: row.notability,
    validFrom,
    validUntil,
    claimMetric,
    claimValue,
    claimUnit: row.claimUnit,
    claimPeriod: row.claimPeriod,
    rowNum: row.rowNum,
    sourceMarkdownSlug: c.sourceMarkdownSlug,
    supersededBy: row.supersededBy,
    forgotten: row.forgotten,
  };
}

// ─── Fence stripping (deny-by-default visibility) ───────────────────────────

const stripOptsSchema = z.object({ keepVisibility: visibilitySchema.optional() }).optional();

/** Options for {@link stripFactsFence}. */
export type StripFactsOptions = z.infer<typeof stripOptsSchema>;

/**
 * Remove or filter the `## Facts` fence for the chunker / remote path.
 *
 * DENY-BY-DEFAULT: with no `keepVisibility`, the ENTIRE fence (heading +
 * table) is removed so a private row can never leak through a forgotten
 * option. `keepVisibility: 'world'` keeps the fence but drops every row whose
 * visibility ≠ `world`. The rest of the markdown is left byte-for-byte intact.
 */
export function stripFactsFence(markdown: string, opts?: StripFactsOptions): string {
  const md = markdownSchema.parse(markdown);
  const options = stripOptsSchema.parse(opts);
  const lines = md.split("\n");
  const located = locateFactsSection(lines);
  if (!located) return md;

  const before = lines.slice(0, located.start);
  const after = lines.slice(located.end);

  if (!options?.keepVisibility) {
    // Remove the whole fence; collapse the seam so we don't leave a double
    // blank where the section used to be.
    while (before.length > 0 && (before[before.length - 1] ?? "").trim() === "") {
      before.pop();
    }
    const tail = [...after];
    while (tail.length > 0 && (tail[0] ?? "").trim() === "") tail.shift();
    const joined = [...before, ...(tail.length > 0 ? ["", ...tail] : [])].join("\n");
    return md.endsWith("\n") && !joined.endsWith("\n") ? `${joined}\n` : joined;
  }

  // Keep the fence, drop rows below the requested visibility band.
  const keep = options.keepVisibility;
  const sectionLines = lines.slice(located.start, located.end);
  const kept: string[] = [];
  for (const line of sectionLines) {
    if (!line.trim().startsWith("|")) {
      kept.push(line);
      continue;
    }
    const cells = splitRow(line);
    if (isSeparator(cells)) {
      kept.push(line);
      continue;
    }
    const isHeader = /(^|\s)#($|\s)/.test(cells.join(" ")) || cells[1] === "claim";
    if (isHeader) {
      kept.push(line);
      continue;
    }
    if (parseVisibility(cells[4]) === keep) kept.push(line);
  }

  return [...before, ...kept, ...after].join("\n");
}

// ─── Trajectory ─────────────────────────────────────────────────────────────

const trajectoryOptsSchema = z
  .object({
    regressionThreshold: z.number().positive().optional(),
    embeddings: z.custom<ReadonlyMap<string, number[]>>().optional(),
  })
  .optional();

/** Options for {@link computeTrajectory}. */
export type TrajectoryOptions = z.infer<typeof trajectoryOptsSchema>;

/**
 * Build the per-metric {@link Trajectory} from a fact set.
 *
 * Facts with no `claimMetric` are ignored. Within a metric, points are sorted
 * chronologically by `validFrom`. A regression fires when
 * `(newer - older) / older <= -threshold` (default {@link REGRESSION_THRESHOLD});
 * `older === 0` is guarded so we never divide by zero (⇒ no regression).
 *
 * `driftScore = clamp(1 - mean(cosineSimilarity over consecutive embedded
 * points), 0, 1)`, or `null` with fewer than 3 embedded points. The return
 * object is additive-only and stamped with {@link TRAJECTORY_SCHEMA_VERSION}.
 */
export function computeTrajectory(facts: readonly Fact[], opts?: TrajectoryOptions): Trajectory {
  const options = trajectoryOptsSchema.parse(opts);
  const threshold = options?.regressionThreshold ?? REGRESSION_THRESHOLD;
  const embeddings = options?.embeddings;

  // Group by metric, preserving first-seen order for stable output.
  const groups = new Map<string, Fact[]>();
  for (const f of facts) {
    if (f.claimMetric === undefined || f.claimValue === undefined) continue;
    const existing = groups.get(f.claimMetric);
    if (existing) existing.push(f);
    else groups.set(f.claimMetric, [f]);
  }

  const metrics: MetricTrajectory[] = [];
  for (const [metric, groupFacts] of groups) {
    const sorted = [...groupFacts].sort((a, b) =>
      a.validFrom < b.validFrom ? -1 : a.validFrom > b.validFrom ? 1 : 0,
    );

    const points = sorted.map((f) => ({
      value: f.claimValue as number,
      validFrom: f.validFrom,
    }));

    const regressions: RegressionPoint[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const older = points[i - 1] as { value: number; validFrom: string };
      const newer = points[i] as { value: number; validFrom: string };
      if (older.value === 0) continue; // guard: never divide by zero
      const relativeChange = (newer.value - older.value) / older.value;
      if (relativeChange <= -threshold) {
        regressions.push({
          from: older.value,
          to: newer.value,
          fromDate: older.validFrom,
          toDate: newer.validFrom,
          relativeChange,
        });
      }
    }

    let driftScore: number | null = null;
    if (embeddings) {
      const embedded = sorted
        .map((f) => embeddings.get(f.claim))
        .filter((e): e is number[] => Array.isArray(e));
      if (embedded.length >= 3) {
        let sum = 0;
        let pairs = 0;
        for (let i = 1; i < embedded.length; i++) {
          sum += cosineSimilarity(embedded[i - 1] as number[], embedded[i] as number[]);
          pairs += 1;
        }
        const meanSim = pairs > 0 ? sum / pairs : 1;
        driftScore = clamp(1 - meanSim, 0, 1);
      }
    }

    metrics.push({ metric, points, regressions, driftScore });
  }

  return { schemaVersion: TRAJECTORY_SCHEMA_VERSION, metrics };
}
