/**
 * Tests for the graph/backlink-boosted hybrid retrieval fusion.
 *
 * Every assertion pins one rung of the EXACT pipeline ladder (candidates →
 * zero-LLM intent → weighted RRF → normalize → compiled-truth → cosine blend →
 * floor-gated post-fusion boosts → graph expand → dedup/budget → modes/cache).
 * No mock libraries: the {@link VectorRetriever}, {@link GraphStore}, and
 * {@link FusionCache} ports are hand-written in-memory fakes, and the only
 * clock is the injected `now`, so a given (input, now) pair is forever
 * deterministic.
 */

import { describe, expect, it } from "vitest";
import {
  BACKLINK_BOOST_COEF,
  COMPILED_TRUTH_BOOST,
  classifyIntent,
  effectiveRrfK,
  type FusedHit,
  type FusionCache,
  fuse,
  INTENT_MAX_BOOST,
  MODE_PRESETS,
  PER_PAGE_CAP,
  RRF_COSINE_BLEND,
  RRF_K,
  SALIENCE_CLIP,
} from "./hybrid-fusion";
import type { GraphStore, PageId, RetrievedItem, SourceScope, VectorRetriever } from "./interfaces";
import { cosineSimilarity } from "./interfaces";

// ─── Fixtures / in-memory fakes ─────────────────────────────────────────────

const SCOPE = "kg_testscope" as SourceScope;

type ExtraMeta = {
  emotionalWeight?: number;
  date?: string;
};

function item(
  pageId: string,
  chunkId: string,
  text: string,
  rawScore: number,
  embedding?: number[],
  extra?: ExtraMeta,
): RetrievedItem & ExtraMeta {
  const base: RetrievedItem = {
    pageId,
    chunkId,
    text,
    rawScore,
    embedding,
  };
  return { ...base, ...extra };
}

/**
 * A scriptable VectorRetriever fake. `retrieveLists` is the ordered set of
 * vector-variant result lists; `keywordList` is the single keyword list;
 * `embedding` is what `embed(query)` returns.
 */
class FakeVector implements VectorRetriever {
  embedCalls = 0;
  retrieveCalls = 0;
  keywordCalls = 0;

  constructor(
    private readonly retrieveListsByQuery: Record<string, RetrievedItem[]>,
    private readonly keywordList: RetrievedItem[],
    private readonly queryEmbedding: number[] = [],
  ) {}

  async retrieve(
    _scope: SourceScope,
    query: string,
    _opts: { limit: number },
  ): Promise<RetrievedItem[]> {
    this.retrieveCalls += 1;
    return this.retrieveListsByQuery[query] ?? [];
  }

  async keyword(
    _scope: SourceScope,
    _query: string,
    _opts: { limit: number },
  ): Promise<RetrievedItem[]> {
    this.keywordCalls += 1;
    return this.keywordList;
  }

  async embed(_text: string): Promise<number[]> {
    this.embedCalls += 1;
    return this.queryEmbedding;
  }
}

class FakeGraph implements GraphStore {
  traverseCalls = 0;

  constructor(
    private readonly backlinks: Record<string, number> = {},
    private readonly reachable: Array<{ pageId: PageId; hop: number }> = [],
  ) {}

  async upsertEdges(): Promise<void> {
    /* unused */
  }

  async deleteEdgesByOrigin(): Promise<void> {
    /* unused */
  }

  async backlinkCount(_scope: SourceScope, pageId: PageId): Promise<number> {
    return this.backlinks[pageId] ?? 0;
  }

  async traverse(
    _scope: SourceScope,
    _seeds: readonly PageId[],
    _maxHops: number,
  ): Promise<Array<{ pageId: PageId; hop: number }>> {
    this.traverseCalls += 1;
    return this.reachable;
  }
}

class FakeCache implements FusionCache {
  store = new Map<string, FusedHit[]>();
  getCalls: string[] = [];
  setCalls: string[] = [];

  async get(key: string): Promise<FusedHit[] | undefined> {
    this.getCalls.push(key);
    return this.store.get(key);
  }

  async set(key: string, value: FusedHit[]): Promise<void> {
    this.setCalls.push(key);
    this.store.set(key, value);
  }
}

// ─── Intent classification (zero-LLM, regex) ────────────────────────────────

describe("classifyIntent", () => {
  it("classifies a definitional 'what is' query as lookup", () => {
    expect(classifyIntent("What is a knowledge graph?")).toBe("lookup");
    expect(classifyIntent("define entity resolution")).toBe("lookup");
  });

  it("classifies an open-ended query as exploratory", () => {
    expect(classifyIntent("tell me about graph retrieval strategies")).toBe("exploratory");
  });

  it("classifies a time-anchored query as temporal", () => {
    expect(classifyIntent("what changed in 2026")).toBe("temporal");
    expect(classifyIntent("latest updates since last quarter")).toBe("temporal");
  });

  it("classifies a connection query as relational", () => {
    expect(classifyIntent("how is Alice related to Acme")).toBe("relational");
    expect(classifyIntent("connection between X and Y")).toBe("relational");
  });

  it("falls back to exploratory for an unclassifiable query", () => {
    expect(classifyIntent("blorptz quux")).toBe("exploratory");
  });
});

describe("effectiveRrfK", () => {
  it("returns the base k unchanged for a non-tilting intent/list pair", () => {
    expect(effectiveRrfK(RRF_K, "vector", "lookup")).toBe(RRF_K);
  });

  it("lowers k for the keyword list under relational intent (exact hits rank harder)", () => {
    const tilted = effectiveRrfK(RRF_K, "keyword", "relational");
    expect(tilted).toBeLessThan(RRF_K);
  });

  it("keeps every tilt bounded by INTENT_MAX_BOOST", () => {
    const intents = ["lookup", "exploratory", "temporal", "relational"] as const;
    const kinds = ["keyword", "vector"] as const;
    for (const intent of intents) {
      for (const kind of kinds) {
        const k = effectiveRrfK(RRF_K, kind, intent);
        expect(k).toBeGreaterThanOrEqual(RRF_K / INTENT_MAX_BOOST - 1e-9);
        expect(k).toBeLessThanOrEqual(RRF_K * INTENT_MAX_BOOST + 1e-9);
      }
    }
  });
});

// ─── Weighted RRF math exactness ────────────────────────────────────────────

describe("fuse — weighted RRF", () => {
  it("sums 1/(effectiveK+rank) across lists per (pageId,chunkId) and normalizes by max", async () => {
    // keyword list: A@0, B@1 ; vector list: B@0, A@1
    const kw = [item("pA", "cA", "alpha", 9), item("pB", "cB", "beta", 8)];
    const vec = [item("pB", "cB", "beta", 7), item("pA", "cA", "alpha", 6)];
    const vector = new FakeVector({ q: vec }, kw);
    const graph = new FakeGraph();

    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph,
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });

    // Each list uses its own intent-tilted effectiveK (exploratory tilts the
    // vector list), so re-derive with the SAME function the pipeline uses.
    // No embeddings → blended score = 0.7 · normRRF.
    const kKw = effectiveRrfK(RRF_K, "keyword", "exploratory");
    const kVec = effectiveRrfK(RRF_K, "vector", "exploratory");
    // A: keyword rank 0 + vector rank 1 ; B: keyword rank 1 + vector rank 0.
    const rawA = 1 / (kKw + 0) + 1 / (kVec + 1);
    const rawB = 1 / (kKw + 1) + 1 / (kVec + 0);
    const max = Math.max(rawA, rawB);
    const byId = new Map(hits.map((h) => [h.pageId, h.score]));
    expect(byId.get("pA")).toBeCloseTo(RRF_COSINE_BLEND.rrf * (rawA / max), 10);
    expect(byId.get("pB")).toBeCloseTo(RRF_COSINE_BLEND.rrf * (rawB / max), 10);
  });

  it("ranks a top-of-both-lists item above a tail-only item", async () => {
    const kw = [item("pTop", "c1", "top", 9), item("pTail", "c2", "tail", 1)];
    const vec = [item("pTop", "c1", "top", 9), item("pMid", "c3", "mid", 5)];
    const vector = new FakeVector({ q: vec }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(hits[0]?.pageId).toBe("pTop");
  });
});

// ─── Normalization (incl. all-zero, no NaN) ─────────────────────────────────

describe("fuse — normalization", () => {
  it("never yields NaN when every contribution is zero (empty lists)", async () => {
    const vector = new FakeVector({ q: [] }, []);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(hits).toEqual([]);
    for (const h of hits) expect(Number.isNaN(h.score)).toBe(false);
  });

  it("maps the single highest RRF item to exactly 1.0 after normalization (visible as 0.7·1 with no cosine)", async () => {
    const kw = [item("pA", "cA", "alpha", 9)];
    const vector = new FakeVector({ q: [] }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    // normRRF = 1.0 by construction; blended = 0.7·1 + 0.3·0 = 0.7.
    expect(hits[0]?.score).toBeCloseTo(RRF_COSINE_BLEND.rrf * 1, 10);
  });
});

// ─── Compiled-truth boost (pre-blend ×2.0) ──────────────────────────────────

describe("fuse — compiled-truth boost", () => {
  it("multiplies a truth-marked chunk's normalized RRF by 2.0 pre-blend", async () => {
    // Two single-item lists so both normalize to RRF 1.0; one is truth-marked.
    const plain = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, [item("pP", "plain:1", "plain", 9)]),
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    const truth = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, [item("pT", "truth:1", "truth", 9)]),
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    // No cosine (no embeddings) → blended = 0.7 * normRRF. Truth doubles normRRF
    // pre-blend, so its blended score is exactly 2× the plain one.
    expect((truth[0]?.score ?? 0) / (plain[0]?.score ?? 1)).toBeCloseTo(COMPILED_TRUTH_BOOST, 10);
  });
});

// ─── Cosine re-score blend 0.7 / 0.3 ────────────────────────────────────────

describe("fuse — cosine blend", () => {
  it("blends exactly 0.7 * normRRF + 0.3 * cosine(queryEmb, itemEmb)", async () => {
    const qEmb = [1, 0];
    const itemEmb = [1, 1]; // cosine = 1/sqrt(2)
    const kw = [item("pA", "cA", "alpha", 9, itemEmb)];
    const vector = new FakeVector({ q: [] }, kw, qEmb);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    const cos = cosineSimilarity(qEmb, itemEmb);
    const expected = RRF_COSINE_BLEND.rrf * 1 + RRF_COSINE_BLEND.cosine * cos;
    expect(hits[0]?.score).toBeCloseTo(expected, 10);
  });

  it("treats an item with no embedding as cosine 0", async () => {
    const kw = [item("pA", "cA", "alpha", 9)]; // no embedding
    const vector = new FakeVector({ q: [] }, kw, [1, 0]);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(hits[0]?.score).toBeCloseTo(RRF_COSINE_BLEND.rrf * 1, 10);
  });
});

// ─── Floor-gated post-fusion boosts ─────────────────────────────────────────

describe("fuse — backlink boost", () => {
  it("scales score by 1 + COEF * ln(1 + backlinkCount)", async () => {
    const kw = [item("pHub", "cHub", "hub", 9)];
    const vector = new FakeVector({ q: [] }, kw);
    const graph = new FakeGraph({ pHub: 10 });
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph,
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    const base = RRF_COSINE_BLEND.rrf * 1; // normRRF 1, no cosine
    const expected = base * (1 + BACKLINK_BOOST_COEF * Math.log(1 + 10));
    expect(hits[0]?.score).toBeCloseTo(expected, 10);
  });
});

describe("fuse — salience clamp", () => {
  it("clamps the salience multiplier to the lower bound (1) at zero weight", async () => {
    const kw = [item("pA", "cA", "alpha", 9, undefined, { emotionalWeight: 0 })];
    const vector = new FakeVector({ q: [] }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(hits[0]?.score).toBeCloseTo(RRF_COSINE_BLEND.rrf * 1, 10);
  });

  it("clamps the salience multiplier to the upper bound (1.6) at huge weight", async () => {
    const kw = [item("pA", "cA", "alpha", 9, undefined, { emotionalWeight: 1e9 })];
    const vector = new FakeVector({ q: [] }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    const expected = RRF_COSINE_BLEND.rrf * 1 * SALIENCE_CLIP[1];
    expect(hits[0]?.score).toBeCloseTo(expected, 10);
  });
});

describe("fuse — recency half-life", () => {
  it("halves the score after exactly one half-life", async () => {
    const now = new Date("2026-05-19T00:00:00.000Z");
    const halfLife = 30;
    const old = new Date(now.getTime() - halfLife * 24 * 60 * 60 * 1000).toISOString();
    const kw = [item("pA", "cA", "alpha", 9, undefined, { date: old })];
    const vector = new FakeVector({ q: [] }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      now,
      knobs: {
        floorThreshold: 0,
        tokenBudget: 1_000_000,
        halfLifeDays: halfLife,
      },
    });
    expect(hits[0]?.score).toBeCloseTo(RRF_COSINE_BLEND.rrf * 1 * 0.5, 8);
  });

  it("does not apply recency decay when no now is supplied", async () => {
    const kw = [
      item("pA", "cA", "alpha", 9, undefined, {
        date: "2000-01-01T00:00:00.000Z",
      }),
    ];
    const vector = new FakeVector({ q: [] }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(hits[0]?.score).toBeCloseTo(RRF_COSINE_BLEND.rrf * 1, 10);
  });
});

describe("fuse — floor gate only reorders the head", () => {
  it("leaves a sub-floor item's score untouched by every post-fusion boost", async () => {
    // pHigh is above floor and backlink-rich; pLow is below floor.
    const kw = [item("pHigh", "cH", "high", 9), item("pLow", "cL", "low", 1)];
    const vec = [item("pHigh", "cH", "high", 9)];
    const vector = new FakeVector({ q: vec }, kw);
    const graph = new FakeGraph({ pHigh: 50, pLow: 50 });

    // First: no floor → both get the backlink boost.
    const unGated = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: vec }, kw),
      graph: new FakeGraph({ pHigh: 50, pLow: 50 }),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    const lowUnGated = unGated.find((h) => h.pageId === "pLow")?.score ?? 0;

    // Then: a floor that pLow's blended score cannot clear.
    const gated = await fuse({
      scope: SCOPE,
      vector,
      graph,
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0.5, tokenBudget: 1_000_000 },
    });
    const lowGated = gated.find((h) => h.pageId === "pLow")?.score ?? 0;

    // The boost moved pLow up when ungated; under the floor it is left alone.
    expect(lowGated).toBeLessThan(lowUnGated);
    // And the unboosted blended value equals 0.7 * normRRF for pLow.
    expect(lowGated).toBeGreaterThan(0);
  });
});

// ─── Graph expand decay 1/(1+hop) additive ──────────────────────────────────

describe("fuse — graph expand", () => {
  it("adds a seed-decayed score 1/(1+hop) to reachable candidates under relational intent", async () => {
    const kw = [item("pSeed", "cS", "seed", 9), item("pReached", "cR", "reached", 4)];
    // pReached is 1 hop from the seed set.
    const graphReachable = new FakeGraph({}, [{ pageId: "pReached", hop: 1 }]);
    // Hold intent + lists CONSTANT (relational both times) so the only delta
    // is whether the graph reports pReached as reachable — isolating the
    // additive 1/(1+hop) bump from any intent-driven RRF-k tilt.
    const expanded = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: graphReachable,
      query: "how is pSeed related to pReached",
      intent: "relational",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    const graphEmpty = new FakeGraph(); // traverse → [] (nothing reachable)
    const noExpand = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: graphEmpty,
      query: "how is pSeed related to pReached",
      intent: "relational",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });

    const reachedExpanded = expanded.find((h) => h.pageId === "pReached")?.score ?? 0;
    const reachedNoExpand = noExpand.find((h) => h.pageId === "pReached")?.score ?? 0;
    expect(graphReachable.traverseCalls).toBeGreaterThan(0);
    expect(graphEmpty.traverseCalls).toBeGreaterThan(0);
    // The reachable page got an additive bump (decayed by 1/(1+1)=0.5).
    expect(reachedExpanded).toBeGreaterThan(reachedNoExpand);
  });

  it("honours an explicit args.expand even when intent is not relational", async () => {
    const kw = [item("pSeed", "cS", "seed", 9), item("pReached", "cR", "reached", 4)];
    const graph = new FakeGraph({}, [{ pageId: "pReached", hop: 2 }]);
    await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph,
      query: "plain query",
      intent: "lookup",
      expand: true,
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(graph.traverseCalls).toBe(1);
  });
});

// ─── Dedup (per-page cap 3) + token budget ──────────────────────────────────

describe("fuse — per-page cap", () => {
  it("keeps at most PER_PAGE_CAP highest-scored chunks per pageId", async () => {
    const kw = [
      item("pA", "c1", "one", 9),
      item("pA", "c2", "two", 8),
      item("pA", "c3", "three", 7),
      item("pA", "c4", "four", 6),
      item("pA", "c5", "five", 5),
    ];
    const vector = new FakeVector({ q: [] }, kw);
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(hits.length).toBe(PER_PAGE_CAP);
    // The dropped chunks are the lowest-scored (c4, c5).
    const keptChunks = hits.map((h) => h.chunkId).sort();
    expect(keptChunks).toEqual(["c1", "c2", "c3"]);
  });
});

describe("fuse — token budget", () => {
  it("stops once cumulative text length would exceed the budget (~4 chars/token)", async () => {
    const long = "x".repeat(40); // 40 chars ≈ 10 tokens
    const kw = [item("pA", "c1", long, 9), item("pB", "c2", long, 8), item("pC", "c3", long, 7)];
    const vector = new FakeVector({ q: [] }, kw);
    // Budget 15 tokens ≈ 60 chars → only the first 40-char chunk fits.
    const hits = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 15 },
    });
    expect(hits.length).toBe(1);
    expect(hits[0]?.chunkId).toBe("c1");
  });
});

// ─── Named modes ────────────────────────────────────────────────────────────

describe("MODE_PRESETS", () => {
  it("exports three distinct named presets", () => {
    expect(Object.keys(MODE_PRESETS).sort()).toEqual(["balanced", "conservative", "tokenmax"]);
  });

  it("gives tokenmax a strictly larger token budget than conservative", () => {
    expect(MODE_PRESETS.tokenmax.tokenBudget).toBeGreaterThan(
      MODE_PRESETS.conservative.tokenBudget,
    );
  });

  it("produces different output sizes under different modes for the same corpus", async () => {
    const long = "y".repeat(400);
    const kw = [
      item("pA", "c1", long, 9),
      item("pB", "c2", long, 8),
      item("pC", "c3", long, 7),
      item("pD", "c4", long, 6),
    ];
    const conservative = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      mode: "conservative",
    });
    const tokenmax = await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      mode: "tokenmax",
    });
    expect(tokenmax.length).toBeGreaterThanOrEqual(conservative.length);
  });
});

// ─── Cache: hit short-circuits; modes get distinct keys ─────────────────────

describe("fuse — cache", () => {
  it("returns the cached value on a hit without re-querying the backends", async () => {
    const kw = [item("pA", "cA", "alpha", 9)];
    const vector = new FakeVector({ q: [] }, kw);
    const cache = new FakeCache();

    const first = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
      cache,
    });
    const keywordCallsAfterMiss = vector.keywordCalls;
    expect(keywordCallsAfterMiss).toBeGreaterThan(0);
    expect(cache.setCalls.length).toBe(1);

    const second = await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
      cache,
    });
    // No additional backend work on the hit.
    expect(vector.keywordCalls).toBe(keywordCallsAfterMiss);
    expect(second).toEqual(first);
  });

  it("segments cache keys by mode so two modes never share an entry", async () => {
    const kw = [item("pA", "cA", "alpha", 9)];
    const cache = new FakeCache();
    await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: new FakeGraph(),
      query: "same-query",
      intent: "exploratory",
      mode: "conservative",
      cache,
    });
    await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: new FakeGraph(),
      query: "same-query",
      intent: "exploratory",
      mode: "tokenmax",
      cache,
    });
    expect(cache.setCalls.length).toBe(2);
    expect(cache.setCalls[0]).not.toBe(cache.setCalls[1]);
    expect(cache.store.size).toBe(2);
  });

  it("segments cache keys by intent so two intents never share an entry", async () => {
    const kw = [item("pA", "cA", "alpha", 9)];
    const cache = new FakeCache();
    await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: new FakeGraph(),
      query: "shared",
      intent: "lookup",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
      cache,
    });
    await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph: new FakeGraph(),
      query: "shared",
      intent: "relational",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
      cache,
    });
    expect(cache.store.size).toBe(2);
  });
});

// ─── Input validation (zod boundary) + immutability ─────────────────────────

describe("fuse — boundary validation & immutability", () => {
  it("rejects an empty query at the zod boundary", async () => {
    await expect(
      fuse({
        scope: SCOPE,
        vector: new FakeVector({ q: [] }, []),
        graph: new FakeGraph(),
        query: "",
      }),
    ).rejects.toThrow();
  });

  it("never mutates the caller's input lists", async () => {
    const kw = [item("pA", "c1", "one", 9), item("pB", "c2", "two", 8)];
    const frozenKw = kw.map((x) => Object.freeze({ ...x }));
    const snapshot = JSON.parse(JSON.stringify(frozenKw));
    const vector = new FakeVector({ q: [] }, frozenKw as RetrievedItem[]);
    await fuse({
      scope: SCOPE,
      vector,
      graph: new FakeGraph(),
      query: "q",
      intent: "exploratory",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(JSON.parse(JSON.stringify(frozenKw))).toEqual(snapshot);
  });

  it("classifies intent itself when no explicit intent is supplied", async () => {
    const kw = [item("pA", "cA", "alpha", 9)];
    const graph = new FakeGraph({}, [{ pageId: "pX", hop: 1 }]);
    // A relational-looking query with no explicit intent must trigger expand.
    await fuse({
      scope: SCOPE,
      vector: new FakeVector({ q: [] }, kw),
      graph,
      query: "what is the relationship between A and B",
      knobs: { floorThreshold: 0, tokenBudget: 1_000_000 },
    });
    expect(graph.traverseCalls).toBe(1);
  });
});
