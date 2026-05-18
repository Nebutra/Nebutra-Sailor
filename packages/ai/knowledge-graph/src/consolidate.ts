/**
 * The idempotent overnight consolidate pass.
 *
 * ── What it does ────────────────────────────────────────────────────────────
 * For one entity it clusters the active (non-superseded) facts by semantic
 * similarity, promotes each multi-member cluster to ONE canonical "take" via a
 * semantic upsert, and stamps chronological supersession so the cluster reads
 * as a single time-ordered chain. It is the nightly compaction of a noisy
 * fact ledger into a clean trajectory.
 *
 * ── The observable-no-op invariant (the whole point) ────────────────────────
 * Re-running the pass over *unchanged store state* must change zero rows and
 * insert nothing. This is not a hopeful property — it is *provable* and
 * *observable*:
 *   • {@link FactStore.upsertTake} is keyed by a stable {@link TakeUpsertKey}
 *     ({pageId, claim, sinceDate}); by the store's contract it UPSERTs, never
 *     re-INSERTs, so re-issuing the same key is non-mutating.
 *   • {@link FactStore.setValidUntil} MUST be a true no-op when the target
 *     value already equals the stored one, returning `0` affected rows
 *     (`WHERE valid_until IS DISTINCT FROM $1`). A stable second pass therefore
 *     sums every `setValidUntil` to `0`, so `rowsAffected === 0` and
 *     `noop === true`. Idempotence is thus *witnessed by the affected-row
 *     count*, not merely asserted.
 * Everything here is pure orchestration: the only impurities are the injected
 * `embed` port and the injected {@link FactStore}. No clock is read (the only
 * time source is the injected `now`), no randomness, no I/O. A given
 * (store-state, embed, now) triple always yields the same result, forever.
 *
 * ── Fail-closed legacy guard ────────────────────────────────────────────────
 * If the caller signals `hasLegacyRows`, the *entire destructive pass* is
 * refused before any clustering or writeback — there is no "partial migrate".
 * Running supersession writeback against unmigrated legacy rows could stamp
 * `validUntil` onto rows whose bitemporal shape predates the current model, so
 * silence here fails closed (skip), never open (mutate).
 *
 * ── Why the centroid is the cluster's FIRST member ──────────────────────────
 * Clustering is greedy and single-pass: each fact joins the FIRST existing
 * cluster whose centroid it is within `clusterThreshold` of, where the
 * centroid is the embedding of that cluster's FIRST member — deliberately NOT
 * a running mean. A first-member anchor is order-stable and drift-free: adding
 * a member can never move the anchor, so the same input always yields the same
 * clusters (a prerequisite for the no-op invariant). A running-mean centroid
 * would let late members pull the anchor and silently re-bucket earlier ones,
 * which would make consolidation non-idempotent. This is a faithful
 * re-expression of the source design's anchoring choice.
 *
 * ── Eligibility (don't compact too eagerly) ─────────────────────────────────
 * A pass runs only when there are at least `minCluster` active facts AND the
 * oldest fact is at least `oldestMinAgeHours` old. Compacting a still-churning
 * recent window would just thrash the take; the age gate lets a window settle
 * before it is frozen into a trajectory.
 */

import { z } from "zod";
import {
  cosineSimilarity,
  type Fact,
  type FactStore,
  type SourceScope,
  type TakeUpsertKey,
} from "./interfaces";

// ─── Tunable defaults (exported — these are part of the contract) ───────────

/** Minimum active-fact count for a pass to run. */
export const MIN_CLUSTER = 3;

/** Cosine similarity at/above which a fact joins a cluster. */
export const CLUSTER_THRESHOLD = 0.85;

/** The oldest active fact must be at least this many hours old. */
export const OLDEST_MIN_AGE_HOURS = 24;

const MS_PER_HOUR = 3_600_000;

// ─── Result ─────────────────────────────────────────────────────────────────

/**
 * The outcome of one pass. `noop` is `true` when nothing semantically changed:
 * either no cluster was eligible for promotion, or a promoting pass found the
 * store already in its target shape (every `setValidUntil` returned `0`).
 * `skippedReason` is present ONLY when the pass declined to do work
 * (`exactOptionalPropertyTypes` — the key is omitted, never `undefined`).
 */
export interface ConsolidateResult {
  readonly clustersPromoted: number;
  readonly rowsAffected: number;
  readonly noop: boolean;
  readonly skippedReason?: string;
}

// ─── Public input boundary (Zod-validated, fail-closed) ─────────────────────

const optsSchema = z
  .object({
    minCluster: z.number().int().min(1).optional(),
    clusterThreshold: z.number().min(0).max(1).optional(),
    oldestMinAgeHours: z.number().min(0).optional(),
  })
  .strict();

/** Tunable knobs; each falls back to the exported default when omitted. */
export type ConsolidateOpts = z.infer<typeof optsSchema>;

const argsSchema = z.object({
  entitySlug: z.string().trim().min(1, "entitySlug is required (fail-closed)"),
  now: z.date({ message: "now must be a Date (the only clock)" }),
  hasLegacyRows: z.boolean().optional(),
  opts: optsSchema.optional(),
});

/**
 * The full argument bag. `scope`, `store`, and `embed` are opaque ports —
 * validated structurally by the type system, not re-parsed by Zod (a Zod
 * schema cannot meaningfully validate a function or a branded string beyond
 * presence). The serializable surface (`entitySlug`, `now`, `hasLegacyRows`,
 * `opts`) is Zod-validated.
 */
export interface ConsolidateArgs {
  readonly scope: SourceScope;
  readonly store: FactStore;
  readonly embed: (claim: string) => Promise<number[]>;
  readonly entitySlug: string;
  readonly now: Date;
  readonly hasLegacyRows?: boolean;
  readonly opts?: ConsolidateOpts;
}

// ─── Internal helpers (pure) ────────────────────────────────────────────────

interface Cluster {
  /** The centroid: the embedding of the FIRST member (never a running mean). */
  readonly centroid: readonly number[];
  readonly members: Fact[];
}

const ZERO_RESULT = { clustersPromoted: 0, rowsAffected: 0 } as const;

/** Build a result, conditionally attaching `skippedReason` (exactOptional). */
function makeResult(
  base: { clustersPromoted: number; rowsAffected: number; noop: boolean },
  skippedReason?: string,
): ConsolidateResult {
  return skippedReason === undefined ? base : { ...base, skippedReason };
}

/** Confidence with `undefined` treated as the lowest possible value. */
function conf(f: Fact): number {
  return f.confidence ?? Number.NEGATIVE_INFINITY;
}

/**
 * Pick the take: highest `confidence`, ties broken by earliest `validFrom`,
 * then by stable input order. Pure; does not mutate the input.
 */
function pickTake(members: readonly Fact[]): Fact {
  let best = members[0] as Fact;
  for (let i = 1; i < members.length; i++) {
    const candidate = members[i] as Fact;
    const dc = conf(candidate) - conf(best);
    if (dc > 0) {
      best = candidate;
      continue;
    }
    if (dc === 0 && candidate.validFrom < best.validFrom) {
      best = candidate;
      // equal validFrom ⇒ keep the earlier input index (already held).
    }
  }
  return best;
}

/**
 * Greedy single-pass clustering against first-member centroids. Each fact
 * joins the FIRST cluster within `threshold`; otherwise it seeds a new one.
 * `embeddings` is parallel to `facts` (each claim embedded exactly once).
 */
function clusterFacts(
  facts: readonly Fact[],
  embeddings: readonly number[][],
  threshold: number,
): Cluster[] {
  const clusters: Cluster[] = [];
  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i] as Fact;
    const vec = embeddings[i] as number[];
    let placed = false;
    for (const cluster of clusters) {
      if (cosineSimilarity(vec, cluster.centroid) >= threshold) {
        cluster.members.push(fact);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ centroid: vec, members: [fact] });
  }
  return clusters;
}

// ─── The pass ───────────────────────────────────────────────────────────────

/**
 * Run one idempotent consolidate pass for `entitySlug`. See the module header
 * for the observable-no-op invariant and the fail-closed legacy guard.
 */
export async function consolidate(args: ConsolidateArgs): Promise<ConsolidateResult> {
  const { scope, store, embed } = args;
  const { entitySlug, now, hasLegacyRows, opts } = argsSchema.parse({
    entitySlug: args.entitySlug,
    now: args.now,
    ...(args.hasLegacyRows === undefined ? {} : { hasLegacyRows: args.hasLegacyRows }),
    ...(args.opts === undefined ? {} : { opts: args.opts }),
  });

  // 1. FAIL-CLOSED LEGACY GUARD — refuse the destructive pass entirely.
  if (hasLegacyRows === true) {
    return makeResult({ ...ZERO_RESULT, noop: true }, "legacy-unmigrated-rows");
  }

  const minCluster = opts?.minCluster ?? MIN_CLUSTER;
  const clusterThreshold = opts?.clusterThreshold ?? CLUSTER_THRESHOLD;
  const oldestMinAgeHours = opts?.oldestMinAgeHours ?? OLDEST_MIN_AGE_HOURS;

  // 2. LOAD + ELIGIBILITY. Work on the store's snapshot only; never mutate it.
  const active = await store.listActive(scope, entitySlug);

  if (active.length < minCluster) {
    return makeResult({ ...ZERO_RESULT, noop: true }, "not-eligible");
  }

  // Oldest fact's validFrom must be ≥ oldestMinAgeHours before `now`.
  let oldestValidFrom = active[0]?.validFrom ?? "";
  for (const f of active) {
    if (f.validFrom < oldestValidFrom) oldestValidFrom = f.validFrom;
  }
  const oldestAgeMs = now.getTime() - new Date(oldestValidFrom).getTime();
  if (oldestAgeMs < oldestMinAgeHours * MS_PER_HOUR) {
    return makeResult({ ...ZERO_RESULT, noop: true }, "not-eligible");
  }

  // 3. EMBED each claim exactly once (parallel array, reused for clustering).
  const embeddings: number[][] = [];
  for (const f of active) {
    embeddings.push(await embed(f.claim));
  }

  // 4. GREEDY COSINE CLUSTERING against first-member centroids.
  const clusters = clusterFacts(active, embeddings, clusterThreshold);

  // 5. PROMOTE + 6. CHRONOLOGICAL SUPERSESSION WRITEBACK.
  let clustersPromoted = 0;
  let rowsAffected = 0;

  for (const cluster of clusters) {
    // Singletons are never promoted.
    if (cluster.members.length < 2) continue;

    clustersPromoted += 1;

    // PROMOTE: the take is the highest-confidence member (documented tiebreak).
    const take = pickTake(cluster.members);
    const key: TakeUpsertKey = {
      pageId: take.sourceMarkdownSlug,
      claim: take.claim,
      sinceDate: take.validFrom,
    };
    // Semantic UPSERT (never re-INSERT) — idempotent by the store contract.
    await store.upsertTake(scope, key, take.claim);

    // WRITEBACK: sort a COPY by (validFrom ASC, id ASC); stamp each older
    // fact's validUntil to the next fact's validFrom; newest stays unset.
    const chain = [...cluster.members].sort((a, b) => {
      if (a.validFrom !== b.validFrom) return a.validFrom < b.validFrom ? -1 : 1;
      const aid = a.id ?? "";
      const bid = b.id ?? "";
      return aid < bid ? -1 : aid > bid ? 1 : 0;
    });

    for (let i = 0; i < chain.length - 1; i++) {
      const older = chain[i] as Fact;
      const next = chain[i + 1] as Fact;
      if (older.id === undefined) continue;
      // setValidUntil is a true no-op (returns 0) when unchanged ⇒ this is
      // exactly what makes a stable re-run sum to rowsAffected === 0.
      rowsAffected += await store.setValidUntil(scope, older.id, next.validFrom);
    }
  }

  // 6. NO-OP OBSERVABILITY. A pass that promoted nothing is a no-op; a pass
  // that promoted but changed zero rows (stable re-run) is also a no-op.
  const noop = clustersPromoted === 0 || rowsAffected === 0;

  return makeResult({ clustersPromoted, rowsAffected, noop });
}
