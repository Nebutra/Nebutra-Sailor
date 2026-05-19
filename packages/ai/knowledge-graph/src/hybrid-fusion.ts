/**
 * Graph/backlink-boosted hybrid retrieval fusion.
 *
 * ── What the genuine delta is ───────────────────────────────────────────────
 * Plain vector search returns one rank-ordered list. This layer's value-add is
 * the FUSION + BACKLINK/GRAPH BOOST stack on top of it: a keyword list and N
 * vector-variant lists are reciprocal-rank-fused with intent-tilted weights,
 * cosine-re-scored, then nudged by *structural* graph signals (backlink mass,
 * salience, recency, n-hop reachability) that a flat embedding store cannot
 * see. The output is a small, deduped, token-budgeted set of chunks.
 *
 * ── EXACT pipeline order (each rung is independently asserted) ───────────────
 *   1. CANDIDATES — one keyword list (`vector.keyword`) + N vector-variant
 *      lists (`vector.retrieve`; at minimum the raw query). Lists are treated
 *      generically so more variants can be slotted in without touching the
 *      fusion math. Each list is already rank-ordered by its backend
 *      `rawScore`; we fuse on *rank*, never on the raw score directly.
 *   2. ZERO-LLM INTENT — `classifyIntent` buckets the query into one of four
 *      classes by regex (no model call, deterministic). An explicit
 *      `args.intent` short-circuits classification.
 *   3. WEIGHTED RRF — per list, `contribution = 1 / (effectiveK + rank)` with
 *      0-based rank and a per-(list-kind, intent) `effectiveK`. Base
 *      {@link RRF_K} = 60. The intent tilt lets, e.g., a relational query make
 *      exact keyword hits rank harder, but is bounded by
 *      {@link INTENT_MAX_BOOST} so no list can be tilted into dominance.
 *   4. NORMALIZE — divide the summed RRF by its max so scores live in [0,1].
 *      An all-zero corpus stays all-zero (never NaN).
 *   5. COMPILED-TRUTH BOOST — a chunk whose `chunkId` starts with the
 *      {@link TRUTH_MARKER} prefix is a curated, human-compiled assertion. Its
 *      normalized RRF is multiplied by {@link COMPILED_TRUTH_BOOST} = 2.0
 *      *pre-blend* (faithful to source: the boost compounds with the cosine
 *      term, it is not a post-hoc add).
 *   6. COSINE RE-SCORE — `blended = 0.7 * normRRF + 0.3 * cosine(qEmb, itemEmb)`
 *      ({@link RRF_COSINE_BLEND}). An item with no embedding contributes a
 *      cosine term of 0 (it keeps its lexical/structural standing, it is not
 *      penalized below zero).
 *   7. POST-FUSION BOOSTS — backlink, salience, recency. EVERY boost is gated
 *      by a single absolute `floorThreshold`: only items whose blended score
 *      already clears the floor are eligible. This is the *floor-gate
 *      invariant* — boosts may only reorder the HEAD of the result; a
 *      sub-floor item's score is left exactly as the blend produced it, so a
 *      structurally-loud-but-irrelevant page can never be resurfaced from the
 *      long tail.
 *   8. GRAPH EXPAND (optional) — when intent is `relational` or `args.expand`
 *      is set, the current top-K pageIds seed a `graph.traverse`; each
 *      reachable page contributes `seedScore * 1/(1+hop)` *additively* to any
 *      candidate on it, then the set is re-sorted.
 *   9. DEDUP + BUDGET — at most {@link PER_PAGE_CAP} = 3 chunks per pageId
 *      (highest-scored kept), then a cumulative token budget (~4 chars/token)
 *      truncates the tail.
 *  10. MODES + CACHE — `conservative | balanced | tokenmax` bundle knob
 *      presets ({@link MODE_PRESETS}). If a {@link FusionCache} is supplied the
 *      key is `knobsHash(query, { ...effectiveKnobs, intent, mode })`. Because
 *      the hash folds in the *resolved* knobs, the intent, AND the mode,
 *      two modes (or two intents) over the same query can never collide on a
 *      single cache slot — the cache-key-segmentation safety property.
 *
 * ── Purity ──────────────────────────────────────────────────────────────────
 * Pure orchestration. The only impurity is the injected `vector` / `graph` /
 * optional `cache` ports and an optional injected `now` (no `Date.now`, no
 * `Math.random`). Inputs and the lists they hand back are never mutated —
 * every sort/slice works on a fresh copy.
 */

import { clamp } from "@nebutra/ai-primitives";

import { z } from "zod";
import {
  cosineSimilarity,
  type GraphStore,
  knobsHash,
  type PageId,
  type RetrievedItem,
  type SourceScope,
  type VectorRetriever,
} from "./interfaces";

// ─── Tunable constants (each documents its rationale) ───────────────────────

/**
 * Reciprocal-rank-fusion damping. The classic TREC value: large enough that a
 * rank-0 hit (1/60) and a rank-5 hit (1/65) stay within ~8% of each other, so
 * fusion rewards *agreement across lists* over any single list's confidence.
 */
export const RRF_K = 60 as const;

/**
 * A curated, human-compiled "this is true" chunk outranks merely-relevant
 * prose. ×2.0 applied to the normalized RRF *pre-blend* so the boost still has
 * to survive the cosine re-score (a truth chunk that is also semantically
 * off-topic is correctly tempered).
 */
export const COMPILED_TRUTH_BOOST = 2.0 as const;

/** `chunkId` prefix that flags a compiled-truth chunk. */
export const TRUTH_MARKER = "truth:" as const;

/**
 * Backlink mass is logged, not linear: a page with 1,000 inbound links is
 * authoritative but not 1,000× more relevant than one with a single link.
 * 0.05 keeps even a very hub-like page's boost gentle (ln(1+1000)·0.05 ≈ 0.35).
 */
export const BACKLINK_BOOST_COEF = 0.05 as const;

/**
 * Final score = 0.7 · (rank-fusion signal) + 0.3 · (raw semantic similarity).
 * Fusion carries the structural/lexical consensus; cosine is a minority
 * tie-breaker so a single embedding model can't override list agreement.
 */
export const RRF_COSINE_BLEND = { rrf: 0.7, cosine: 0.3 } as const;

/**
 * Salience (emotional weight) can lift a memorable item but never let an
 * affect-loaded note dominate substance — multiplier clamped to [1, 1.6].
 */
export const SALIENCE_CLIP = [1, 1.6] as const;

/** Salience grows with log(weight); coefficient tuned against the clip band. */
export const SALIENCE_COEF = 0.2 as const;

/**
 * The intent tilt may scale a list's effective k by at most ±25%. Bounding it
 * keeps intent a *nudge*, not a kill-switch: no query class can tilt one list
 * into deterministic dominance.
 */
export const INTENT_MAX_BOOST = 1.25 as const;

/** Default recency half-life (days) when a corpus carries `date`s. */
export const DEFAULT_HALF_LIFE_DAYS = 30 as const;

/** A single pageId may not flood the result with more than 3 chunks. */
export const PER_PAGE_CAP = 3 as const;

/** How many top pageIds seed the optional graph-expand walk. */
const EXPAND_SEED_K = 10 as const;

/** Max hops for the graph-expand walk. */
const EXPAND_MAX_HOPS = 2 as const;

/** Coarse token estimate: ~4 characters per token. */
const CHARS_PER_TOKEN = 4 as const;

// ─── Public types ───────────────────────────────────────────────────────────

/** Zero-LLM query intent buckets (regex-classified). */
export type Intent = "lookup" | "exploratory" | "temporal" | "relational";

/** Named knob bundles. */
export type SearchMode = "conservative" | "balanced" | "tokenmax";

/** Which candidate list a contribution came from (drives the intent tilt). */
export type ListKind = "keyword" | "vector";

/** The tunable surface. All fields optional at the public boundary. */
export interface FusionKnobs {
  /**
   * Absolute blended-score gate. Only items at or above this clear the gate
   * and become eligible for post-fusion boosts (floor-gate invariant).
   */
  readonly floorThreshold: number;
  /** Cumulative output token budget (~4 chars/token). */
  readonly tokenBudget: number;
  /** Recency half-life in days (applied only when an injected `now` exists). */
  readonly halfLifeDays: number;
  /** Per-page chunk cap (defaults to {@link PER_PAGE_CAP}). */
  readonly perPageCap: number;
  /** Vector / keyword candidate fan-out. */
  readonly candidateLimit: number;
}

/** One fused, re-scored, deduped result chunk. */
export interface FusedHit {
  readonly pageId: PageId;
  readonly chunkId: string;
  readonly text: string;
  readonly score: number;
}

/** Optional result cache port (key → fused hits). */
export interface FusionCache {
  get(key: string): Promise<FusedHit[] | undefined>;
  set(key: string, value: FusedHit[]): Promise<void>;
}

/** Named knob presets. `balanced` is the default. */
export const MODE_PRESETS: Readonly<Record<SearchMode, FusionKnobs>> = {
  conservative: {
    floorThreshold: 0.35,
    tokenBudget: 1_500,
    halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
    perPageCap: 2,
    candidateLimit: 20,
  },
  balanced: {
    floorThreshold: 0.2,
    tokenBudget: 4_000,
    halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
    perPageCap: PER_PAGE_CAP,
    candidateLimit: 40,
  },
  tokenmax: {
    floorThreshold: 0.1,
    tokenBudget: 16_000,
    halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
    perPageCap: PER_PAGE_CAP,
    candidateLimit: 80,
  },
} as const;

// ─── Boundary validation (zod) ──────────────────────────────────────────────

const intentSchema = z.enum(["lookup", "exploratory", "temporal", "relational"]);
const modeSchema = z.enum(["conservative", "balanced", "tokenmax"]);

const knobsSchema = z
  .object({
    floorThreshold: z.number().finite(),
    tokenBudget: z.number().positive(),
    halfLifeDays: z.number().positive(),
    perPageCap: z.number().int().positive(),
    candidateLimit: z.number().int().positive(),
  })
  .partial();

/**
 * Only the *serializable* surface is zod-validated; the ports (`vector`,
 * `graph`, `cache`) and the injected `now` are structural and validated by
 * the type system, not at runtime (they carry no untrusted data).
 */
const fuseArgsSchema = z.object({
  scope: z.string().min(1, "scope is required (fail-closed)"),
  query: z.string().trim().min(1, "query is required (fail-closed)"),
  intent: intentSchema.optional(),
  mode: modeSchema.optional(),
  expand: z.boolean().optional(),
  knobs: knobsSchema.optional(),
});

// ─── Public args ────────────────────────────────────────────────────────────

export interface FuseArgs {
  readonly scope: SourceScope;
  readonly vector: VectorRetriever;
  readonly graph: GraphStore;
  readonly query: string;
  readonly intent?: Intent | undefined;
  readonly mode?: SearchMode | undefined;
  readonly expand?: boolean | undefined;
  readonly knobs?: Partial<FusionKnobs> | undefined;
  readonly now?: Date | undefined;
  readonly cache?: FusionCache | undefined;
}

// ─── Zero-LLM intent classifier ─────────────────────────────────────────────

const RELATIONAL_RE =
  /\b(relat(?:ed|ionship|ions)?|connect(?:ed|ion|ions)?|between|linked?|tie[ds]?|associat\w*)\b/i;
const TEMPORAL_RE =
  /\b(when|since|until|before|after|latest|recent|history|changed?|update[ds]?|timeline|year|month|quarter|today|yesterday|(?:19|20)\d{2})\b/i;
const LOOKUP_RE =
  /\b(what\s+is|what\s+are|who\s+is|define[ds]?|definition|meaning\s+of|explain\s+the\s+term)\b/i;

/**
 * Bucket a query into one of four intents by regex precedence:
 * relational > temporal > lookup > (fallback) exploratory. Precedence is
 * deliberate: a connective phrase ("how is X related to Y in 2026") is
 * relational even though it also reads temporal — the graph signal is the
 * stronger lever for that question.
 */
export function classifyIntent(query: string): Intent {
  const q = query.trim();
  if (RELATIONAL_RE.test(q)) return "relational";
  if (TEMPORAL_RE.test(q)) return "temporal";
  if (LOOKUP_RE.test(q)) return "lookup";
  return "exploratory";
}

/**
 * Tilt the RRF damping for a list given the query intent. Lower k ⇒ the list's
 * top ranks contribute more. The only active tilt: a `relational` query lowers
 * k for the *keyword* list (exact-name hits should rank harder when the user
 * is chasing a connection). The tilt magnitude is capped by
 * {@link INTENT_MAX_BOOST} so k stays within [baseK / 1.25, baseK · 1.25].
 */
export function effectiveRrfK(baseK: number, listKind: ListKind, intent: Intent): number {
  let factor = 1;
  if (intent === "relational" && listKind === "keyword") {
    factor = 1 / INTENT_MAX_BOOST; // lower k → keyword top ranks weigh more
  } else if (intent === "lookup" && listKind === "keyword") {
    factor = 1 / 1.1; // a mild lexical lean for definitional queries
  } else if (intent === "exploratory" && listKind === "vector") {
    factor = 1 / 1.1; // semantic spread favoured for open-ended queries
  }
  const clampLo = baseK / INTENT_MAX_BOOST;
  const clampHi = baseK * INTENT_MAX_BOOST;
  return Math.min(clampHi, Math.max(clampLo, baseK * factor));
}

// ─── Internal scoring record ────────────────────────────────────────────────

interface ScoredCandidate {
  readonly pageId: PageId;
  readonly chunkId: string;
  readonly text: string;
  readonly embedding: number[] | undefined;
  readonly emotionalWeight: number | undefined;
  readonly date: string | undefined;
  readonly rrf: number;
  readonly score: number;
}

function metaNumber(item: RetrievedItem, key: string): number | undefined {
  const v = (item as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function metaString(item: RetrievedItem, key: string): string | undefined {
  const v = (item as unknown as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function candidateKey(pageId: PageId, chunkId: string): string {
  return `${pageId} ${chunkId}`;
}

function resolveKnobs(
  mode: SearchMode | undefined,
  overrides: Partial<FusionKnobs> | undefined,
): FusionKnobs {
  const preset = MODE_PRESETS[mode ?? "balanced"];
  return { ...preset, ...(overrides ?? {}) };
}

// ─── The fusion pipeline ────────────────────────────────────────────────────

/**
 * Run the full hybrid-fusion pipeline (see the module header for the exact,
 * independently-tested rung order). Returns a small, deduped, token-budgeted,
 * descending-by-score set of chunks.
 */
export async function fuse(args: FuseArgs): Promise<FusedHit[]> {
  // (boundary) zod-validate only the serializable surface; fail-closed.
  const parsed = fuseArgsSchema.parse({
    scope: args.scope,
    query: args.query,
    intent: args.intent,
    mode: args.mode,
    expand: args.expand,
    knobs: args.knobs,
  });

  const { scope, vector, graph, cache } = args;
  const query = parsed.query;

  // (2) zero-LLM intent — explicit arg short-circuits classification.
  const intent: Intent = parsed.intent ?? classifyIntent(query);
  const mode = parsed.mode;
  const knobs = resolveKnobs(mode, args.knobs);
  const perPageCap = knobs.perPageCap ?? PER_PAGE_CAP;

  // (10) cache: key segments by resolved knobs + intent + mode so no two
  // modes / intents ever collide on one slot.
  const cacheKey = knobsHash(query, {
    ...knobs,
    intent,
    mode: mode ?? "balanced",
  });
  if (cache) {
    const hit = await cache.get(cacheKey);
    if (hit) return hit;
  }

  // (1) candidates — keyword list + N vector-variant lists (raw query is the
  // minimum; the array is generic so more variants slot in untouched).
  const limit = knobs.candidateLimit;
  const [keywordList, rawVectorList] = await Promise.all([
    vector.keyword(scope, query, { limit }),
    vector.retrieve(scope, query, { limit }),
  ]);

  const lists: Array<{ kind: ListKind; items: readonly RetrievedItem[] }> = [
    { kind: "keyword", items: [...keywordList] },
    { kind: "vector", items: [...rawVectorList] },
  ];

  // (3) weighted RRF — sum 1/(effectiveK + rank) per (pageId,chunkId).
  const acc = new Map<string, ScoredCandidate>();
  for (const list of lists) {
    const effK = effectiveRrfK(RRF_K, list.kind, intent);
    list.items.forEach((it, rank) => {
      const key = candidateKey(it.pageId, it.chunkId);
      const contribution = 1 / (effK + rank);
      const prior = acc.get(key);
      if (prior) {
        acc.set(key, { ...prior, rrf: prior.rrf + contribution });
      } else {
        acc.set(key, {
          pageId: it.pageId,
          chunkId: it.chunkId,
          text: it.text,
          embedding: it.embedding,
          emotionalWeight: metaNumber(it, "emotionalWeight"),
          date: metaString(it, "date"),
          rrf: contribution,
          score: 0,
        });
      }
    });
  }

  let candidates = [...acc.values()];

  // (4) normalize summed RRF to [0,1]; all-zero stays all-zero (no NaN).
  const maxRrf = candidates.reduce((m, c) => Math.max(m, c.rrf), 0);
  candidates = candidates.map((c) => ({
    ...c,
    rrf: maxRrf > 0 ? c.rrf / maxRrf : 0,
  }));

  // (5) compiled-truth boost — ×2.0 on the normalized RRF, pre-blend.
  candidates = candidates.map((c) =>
    c.chunkId.startsWith(TRUTH_MARKER) ? { ...c, rrf: c.rrf * COMPILED_TRUTH_BOOST } : c,
  );

  // (6) cosine re-score — blended = 0.7·normRRF + 0.3·cosine(qEmb,itemEmb).
  const queryEmbedding = await vector.embed(query);
  candidates = candidates.map((c) => {
    const cos =
      c.embedding && c.embedding.length > 0 ? cosineSimilarity(queryEmbedding, c.embedding) : 0;
    const blended = RRF_COSINE_BLEND.rrf * c.rrf + RRF_COSINE_BLEND.cosine * cos;
    return { ...c, score: blended };
  });

  // (7) floor-gated post-fusion boosts — ONLY items at/above the floor are
  // eligible; a sub-floor item's score is left exactly as the blend produced
  // it (floor-gate invariant: boosts reorder the head, never the long tail).
  const floor = knobs.floorThreshold;
  const now = args.now;
  const halfLife = knobs.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;

  const boosted: ScoredCandidate[] = [];
  for (const c of candidates) {
    if (c.score < floor) {
      boosted.push(c);
      continue;
    }
    let s = c.score;

    // backlink: ×(1 + COEF·ln(1 + backlinkCount))
    const backlinks = await graph.backlinkCount(scope, c.pageId);
    s *= 1 + BACKLINK_BOOST_COEF * Math.log(1 + backlinks);

    // salience: ×clamp(1 + COEF·ln(1 + emotionalWeight), 1, 1.6)
    if (c.emotionalWeight !== undefined) {
      const sal = clamp(
        1 + SALIENCE_COEF * Math.log(1 + c.emotionalWeight),
        SALIENCE_CLIP[0],
        SALIENCE_CLIP[1],
      );
      s *= sal;
    }

    // recency half-life: ×0.5^(ageDays / halfLife) (only when `now` injected)
    if (now && c.date) {
      const t = Date.parse(c.date);
      if (!Number.isNaN(t)) {
        const ageDays = (now.getTime() - t) / (24 * 60 * 60 * 1000);
        s *= 0.5 ** (ageDays / halfLife);
      }
    }

    boosted.push({ ...c, score: s });
  }

  let ranked = [...boosted].sort((a, b) => b.score - a.score);

  // (8) graph expand — relational intent or explicit args.expand. Reachable
  // pages get an additive, hop-decayed bump from their seed.
  if (intent === "relational" || args.expand === true) {
    const seeds = ranked.slice(0, EXPAND_SEED_K);
    const seedScoreByPage = new Map<PageId, number>();
    for (const s of seeds) {
      const cur = seedScoreByPage.get(s.pageId) ?? 0;
      if (s.score > cur) seedScoreByPage.set(s.pageId, s.score);
    }
    const seedIds = [...seedScoreByPage.keys()];
    if (seedIds.length > 0) {
      const reached = await graph.traverse(scope, seedIds, EXPAND_MAX_HOPS);
      // Decay against the strongest seed (a coarse upper bound).
      const bestSeed = seedScoreByPage.size > 0 ? Math.max(...seedScoreByPage.values()) : 0;
      const bumpByPage = new Map<PageId, number>();
      for (const r of reached) {
        // Faithful to source: any candidate ON a reachable page gets the
        // hop-decayed seed bump — seeds included (a page that is both a seed
        // and reachable is still "a candidate on a reachable page").
        const bump = bestSeed * (1 / (1 + r.hop));
        const prior = bumpByPage.get(r.pageId) ?? 0;
        if (bump > prior) bumpByPage.set(r.pageId, bump);
      }
      ranked = ranked.map((c) => {
        const bump = bumpByPage.get(c.pageId);
        return bump ? { ...c, score: c.score + bump } : c;
      });
      ranked = [...ranked].sort((a, b) => b.score - a.score);
    }
  }

  // (9) dedup: cap chunks per pageId (keep highest-scored), then token budget.
  const perPageCount = new Map<PageId, number>();
  const capped: ScoredCandidate[] = [];
  for (const c of ranked) {
    const n = perPageCount.get(c.pageId) ?? 0;
    if (n >= perPageCap) continue;
    perPageCount.set(c.pageId, n + 1);
    capped.push(c);
  }

  const budgetChars = knobs.tokenBudget * CHARS_PER_TOKEN;
  const out: FusedHit[] = [];
  let used = 0;
  for (const c of capped) {
    const next = used + c.text.length;
    if (next > budgetChars) break;
    used = next;
    out.push({
      pageId: c.pageId,
      chunkId: c.chunkId,
      text: c.text,
      score: c.score,
    });
  }

  // (10) populate cache on miss.
  if (cache) await cache.set(cacheKey, out);
  return out;
}
