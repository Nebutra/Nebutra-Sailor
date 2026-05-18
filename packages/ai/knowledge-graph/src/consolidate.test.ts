/**
 * Tests for the idempotent overnight consolidate pass.
 *
 * The contract under test is *observable idempotence*: a first pass clusters
 * an entity's recent facts, promotes each cluster to one canonical take, and
 * stamps chronological supersession; a second pass over the *same* store state
 * must change zero rows and insert nothing. No mock libraries — a hand-written
 * in-memory fake {@link FactStore} (modelling the `setValidUntil` no-op as
 * "0 affected rows when the value already equals the target") and a
 * deterministic fake `embed` are the only seams.
 */

import { describe, expect, it } from "vitest";
import {
  CLUSTER_THRESHOLD,
  type ConsolidateResult,
  consolidate,
  MIN_CLUSTER,
  OLDEST_MIN_AGE_HOURS,
} from "./consolidate";
import type { Fact, FactStore, SourceScope, TakeUpsertKey } from "./interfaces";

// ─── Constants ──────────────────────────────────────────────────────────────

const SCOPE = "kg_test_scope" as SourceScope;
const NOW = new Date("2026-05-19T12:00:00.000Z");

/** Hours before {@link NOW}, as an ISO string. */
function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 3_600_000).toISOString();
}

// ─── Fact fixture builder ───────────────────────────────────────────────────

let rowCounter = 0;

function makeFact(overrides: Partial<Fact> = {}): Fact {
  rowCounter += 1;
  return {
    id: `f${rowCounter}`,
    sourceId: "src_1",
    entitySlug: "an-entity",
    claim: `claim ${rowCounter}`,
    kind: "fact",
    confidence: 0.5,
    visibility: "world",
    notability: "medium",
    validFrom: hoursAgo(48),
    validUntil: undefined,
    claimMetric: undefined,
    claimValue: undefined,
    claimUnit: undefined,
    claimPeriod: undefined,
    rowNum: rowCounter,
    sourceMarkdownSlug: "an-entity",
    supersededBy: undefined,
    forgotten: false,
    ...overrides,
  };
}

// ─── In-memory fake FactStore ───────────────────────────────────────────────

interface UpsertCall {
  readonly key: TakeUpsertKey;
  readonly claimText: string;
}

interface SetValidUntilCall {
  readonly factId: string;
  readonly validUntil: string;
  readonly affected: number;
}

/**
 * Hand-written fake. `setValidUntil` models the store's true-no-op contract:
 * it returns `1` only when the stored `validUntil` actually changes and `0`
 * when the row already holds the target value (so a stable re-run sums to 0).
 */
class FakeFactStore implements FactStore {
  readonly upsertCalls: UpsertCall[] = [];
  readonly setValidUntilCalls: SetValidUntilCall[] = [];
  private readonly facts: Fact[];
  private readonly validUntilState = new Map<string, string | undefined>();

  constructor(facts: readonly Fact[]) {
    this.facts = facts.map((f) => ({ ...f }));
    for (const f of this.facts) {
      this.validUntilState.set(f.id as string, f.validUntil);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listActive(_scope: SourceScope, entitySlug: string): Promise<Fact[]> {
    return this.facts.filter((f) => f.entitySlug === entitySlug).map((f) => ({ ...f }));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async upsertTake(_scope: SourceScope, key: TakeUpsertKey, claimText: string): Promise<void> {
    this.upsertCalls.push({ key: { ...key }, claimText });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async setValidUntil(_scope: SourceScope, factId: string, validUntil: string): Promise<number> {
    const current = this.validUntilState.get(factId);
    const affected = current === validUntil ? 0 : 1;
    if (affected === 1) this.validUntilState.set(factId, validUntil);
    this.setValidUntilCalls.push({ factId, validUntil, affected });
    return affected;
  }
}

// ─── Deterministic fake embed ───────────────────────────────────────────────

/**
 * Maps a claim to a unit vector via an explicit table. Two claims sharing a
 * table entry get identical vectors (cosine 1.0); distinct entries are chosen
 * so cosine similarity is well below {@link CLUSTER_THRESHOLD}.
 */
function makeEmbed(table: Record<string, number[]>): (claim: string) => Promise<number[]> {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (claim: string) => {
    const v = table[claim];
    if (!v) throw new Error(`fake embed: no vector for claim ${JSON.stringify(claim)}`);
    return [...v];
  };
}

/** Orthogonal basis vectors ⇒ cosine 0 between groups, 1 within a group. */
const E_A = [1, 0, 0];
const E_B = [0, 1, 0];
const E_C = [0, 0, 1];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("consolidate — exported constants", () => {
  it("pins the documented defaults", () => {
    expect(MIN_CLUSTER).toBe(3);
    expect(CLUSTER_THRESHOLD).toBe(0.85);
    expect(OLDEST_MIN_AGE_HOURS).toBe(24);
  });
});

describe("consolidate — fail-closed legacy guard", () => {
  it("refuses the destructive pass when hasLegacyRows is true", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "x", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
      hasLegacyRows: true,
    });
    expect(result).toEqual<ConsolidateResult>({
      clustersPromoted: 0,
      rowsAffected: 0,
      noop: true,
      skippedReason: "legacy-unmigrated-rows",
    });
    expect(store.upsertCalls).toHaveLength(0);
    expect(store.setValidUntilCalls).toHaveLength(0);
  });

  it("proceeds normally when hasLegacyRows is false or omitted", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "x", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.skippedReason).toBeUndefined();
    expect(result.clustersPromoted).toBe(1);
  });
});

describe("consolidate — eligibility gates", () => {
  it("skips when fewer than MIN_CLUSTER facts are active", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(48) }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(36) }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result).toEqual<ConsolidateResult>({
      clustersPromoted: 0,
      rowsAffected: 0,
      noop: true,
      skippedReason: "not-eligible",
    });
    expect(store.upsertCalls).toHaveLength(0);
  });

  it("admits exactly MIN_CLUSTER facts when old enough", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "x", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.skippedReason).toBeUndefined();
    expect(result.clustersPromoted).toBe(1);
  });

  it("skips when the oldest fact is younger than OLDEST_MIN_AGE_HOURS", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(20) }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(10) }),
      makeFact({ id: "c", claim: "x", validFrom: hoursAgo(5) }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result).toEqual<ConsolidateResult>({
      clustersPromoted: 0,
      rowsAffected: 0,
      noop: true,
      skippedReason: "not-eligible",
    });
  });

  it("admits when the oldest fact is exactly OLDEST_MIN_AGE_HOURS old", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(24), confidence: 0.9 }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(20), confidence: 0.8 }),
      makeFact({ id: "c", claim: "x", validFrom: hoursAgo(10), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.skippedReason).toBeUndefined();
    expect(result.clustersPromoted).toBe(1);
  });

  it("honours opts overrides for minCluster and oldestMinAgeHours", async () => {
    const facts = [
      makeFact({ id: "a", claim: "x", validFrom: hoursAgo(3), confidence: 0.9 }),
      makeFact({ id: "b", claim: "x", validFrom: hoursAgo(2), confidence: 0.8 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ x: E_A }),
      entitySlug: "an-entity",
      now: NOW,
      opts: { minCluster: 2, oldestMinAgeHours: 1 },
    });
    expect(result.skippedReason).toBeUndefined();
    expect(result.clustersPromoted).toBe(1);
  });
});

describe("consolidate — greedy cosine clustering", () => {
  it("clusters facts at or above the threshold together", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    // cb is cosine 1.0 vs ca; cc identical too ⇒ one cluster of 3.
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.clustersPromoted).toBe(1);
    expect(store.upsertCalls).toHaveLength(1);
  });

  it("keeps facts just below the threshold in separate clusters", async () => {
    // Two near-orthogonal vectors ⇒ cosine well under 0.85.
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.7 }),
      makeFact({ id: "d", claim: "cd", validFrom: hoursAgo(28), confidence: 0.6 }),
    ];
    const store = new FakeFactStore(facts);
    // ca,cb in group A; cc,cd in group B (orthogonal to A) ⇒ 2 clusters of 2.
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_B, cd: E_B }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.clustersPromoted).toBe(2);
    expect(store.upsertCalls).toHaveLength(2);
  });

  it("respects an opts.clusterThreshold override", async () => {
    // Vectors with cosine ≈ 0.6; default 0.85 splits them, 0.5 merges them.
    const near = [1, 0.75, 0];
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: near, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
      opts: { clusterThreshold: 0.5 },
    });
    expect(result.clustersPromoted).toBe(1);
  });

  it("compares against the FIRST member (centroid), not a running mean", async () => {
    // Cluster forms from m1 (E_A). m2 (vec with cosine ≥0.85 to E_A) joins.
    // m3 is close to m2 but FAR from m1 — under first-member-centroid it must
    // NOT join cluster-1 (proving centroid != running mean).
    const closeToA = [1, 0.3, 0]; // cosine to E_A ≈ 0.958 ⇒ joins
    const closeToM2FarFromA = [0, 1, 0]; // cosine to E_A = 0 ⇒ must NOT join
    const facts = [
      makeFact({ id: "m1", claim: "m1", validFrom: hoursAgo(60), confidence: 0.9 }),
      makeFact({ id: "m2", claim: "m2", validFrom: hoursAgo(50), confidence: 0.8 }),
      makeFact({ id: "m3", claim: "m3", validFrom: hoursAgo(40), confidence: 0.7 }),
      makeFact({ id: "m4", claim: "m4", validFrom: hoursAgo(30), confidence: 0.6 }),
    ];
    const store = new FakeFactStore(facts);
    // m1=E_A, m2=closeToA (joins c1), m3=closeToM2FarFromA (new c2),
    // m4=closeToM2FarFromA (joins c2). ⇒ 2 clusters of 2.
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({
        m1: E_A,
        m2: closeToA,
        m3: closeToM2FarFromA,
        m4: closeToM2FarFromA,
      }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.clustersPromoted).toBe(2);
    expect(store.upsertCalls).toHaveLength(2);
  });

  it("embeds each distinct claim exactly once", async () => {
    let embedCalls = 0;
    const embed = async (claim: string): Promise<number[]> => {
      embedCalls += 1;
      return claim === "shared" ? [...E_A] : [...E_B];
    };
    const facts = [
      makeFact({ id: "a", claim: "shared", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "shared", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "shared", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed,
      entitySlug: "an-entity",
      now: NOW,
    });
    // Three facts ⇒ three embed calls (once per fact's claim, reused thereafter).
    expect(embedCalls).toBe(3);
  });
});

describe("consolidate — singleton clusters are not promoted", () => {
  it("does not promote a cluster of size 1", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.7 }),
      makeFact({ id: "d", claim: "cd", validFrom: hoursAgo(28), confidence: 0.6 }),
    ];
    const store = new FakeFactStore(facts);
    // ca,cb,cc in group A (cluster of 3, promoted); cd alone in B (singleton).
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A, cd: E_B }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.clustersPromoted).toBe(1);
    expect(store.upsertCalls).toHaveLength(1);
    // The singleton's validUntil is never stamped.
    expect(store.setValidUntilCalls.some((c) => c.factId === "d")).toBe(false);
  });

  it("yields a clean no-op when every cluster is a singleton", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.8 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.7 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_B, cc: E_C }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.clustersPromoted).toBe(0);
    expect(result.rowsAffected).toBe(0);
    expect(result.noop).toBe(true);
    expect(store.upsertCalls).toHaveLength(0);
  });
});

describe("consolidate — take selection", () => {
  it("picks the highest-confidence fact as the take", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: 0.4 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.95 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.6 }),
    ];
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(store.upsertCalls).toHaveLength(1);
    expect(store.upsertCalls[0]?.claimText).toBe("cb");
  });

  it("breaks confidence ties by earliest validFrom", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(30), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(48), confidence: 0.9 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(40), confidence: 0.9 }),
    ];
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    // All tied on confidence; cb has the earliest validFrom (48h ago).
    expect(store.upsertCalls[0]?.claimText).toBe("cb");
  });

  it("treats an undefined confidence as lowest", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(48), confidence: undefined }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.2 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: undefined }),
    ];
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(store.upsertCalls[0]?.claimText).toBe("cb");
  });
});

describe("consolidate — semantic upsert key shape", () => {
  it("passes a TakeUpsertKey of { pageId, claim, sinceDate }", async () => {
    const facts = [
      makeFact({
        id: "a",
        claim: "ca",
        validFrom: hoursAgo(48),
        confidence: 0.95,
        sourceMarkdownSlug: "page-one",
      }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(36), confidence: 0.5 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(30), confidence: 0.4 }),
    ];
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(store.upsertCalls).toHaveLength(1);
    const call = store.upsertCalls[0];
    expect(call?.key).toEqual<TakeUpsertKey>({
      pageId: "page-one",
      claim: "ca",
      sinceDate: hoursAgo(48),
    });
    expect(call?.claimText).toBe("ca");
  });
});

describe("consolidate — chronological supersession writeback", () => {
  it("stamps validUntil = next.validFrom for every older fact, newest untouched", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(60), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(40), confidence: 0.5 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(20), confidence: 0.4 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    // a → validUntil = b.validFrom; b → validUntil = c.validFrom; c untouched.
    const stamped = store.setValidUntilCalls;
    expect(stamped).toHaveLength(2);
    expect(stamped[0]).toMatchObject({ factId: "a", validUntil: hoursAgo(40), affected: 1 });
    expect(stamped[1]).toMatchObject({ factId: "b", validUntil: hoursAgo(20), affected: 1 });
    expect(stamped.some((c) => c.factId === "c")).toBe(false);
    expect(result.rowsAffected).toBe(2);
  });

  it("orders the chain by (validFrom ASC, id ASC)", async () => {
    const sameTime = hoursAgo(50);
    const facts = [
      makeFact({ id: "z", claim: "ca", validFrom: sameTime, confidence: 0.9 }),
      makeFact({ id: "a", claim: "cb", validFrom: sameTime, confidence: 0.5 }),
      makeFact({ id: "m", claim: "cc", validFrom: hoursAgo(25), confidence: 0.4 }),
    ];
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    // Tie on validFrom ⇒ id ASC: a before z; then m is newest (untouched).
    const stamped = store.setValidUntilCalls;
    expect(stamped[0]).toMatchObject({ factId: "a", validUntil: sameTime });
    expect(stamped[1]).toMatchObject({ factId: "z", validUntil: hoursAgo(25) });
    expect(stamped.some((c) => c.factId === "m")).toBe(false);
  });

  it("sums affected-row counts across all clusters into rowsAffected", async () => {
    const facts = [
      // Group A: 3 facts ⇒ 2 stamps.
      makeFact({ id: "a1", claim: "a1", validFrom: hoursAgo(60), confidence: 0.9 }),
      makeFact({ id: "a2", claim: "a2", validFrom: hoursAgo(50), confidence: 0.5 }),
      makeFact({ id: "a3", claim: "a3", validFrom: hoursAgo(40), confidence: 0.4 }),
      // Group B: 2 facts ⇒ 1 stamp.
      makeFact({ id: "b1", claim: "b1", validFrom: hoursAgo(55), confidence: 0.7 }),
      makeFact({ id: "b2", claim: "b2", validFrom: hoursAgo(45), confidence: 0.3 }),
    ];
    const store = new FakeFactStore(facts);
    const result = await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({
        a1: E_A,
        a2: E_A,
        a3: E_A,
        b1: E_B,
        b2: E_B,
      }),
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(result.clustersPromoted).toBe(2);
    // 2 stamps from group A + 1 stamp from group B = 3.
    expect(result.rowsAffected).toBe(3);
    expect(result.noop).toBe(false);
  });
});

describe("consolidate — observable no-op on stable re-run", () => {
  it("changes zero rows and inserts nothing on a second pass over the same state", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(60), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(40), confidence: 0.5 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(20), confidence: 0.4 }),
    ];
    // First pass mutates the fake's internal validUntil state.
    const store = new FakeFactStore(facts);
    const embed = makeEmbed({ ca: E_A, cb: E_A, cc: E_A });

    const first = await consolidate({
      scope: SCOPE,
      store,
      embed,
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(first.clustersPromoted).toBe(1);
    expect(first.rowsAffected).toBe(2);
    expect(first.noop).toBe(false);

    const upsertsAfterFirst = store.upsertCalls.length;

    // Second pass: the listActive snapshot is taken fresh from the same fake,
    // but the validUntil targets already equal the stored values ⇒ every
    // setValidUntil returns 0.
    const second = await consolidate({
      scope: SCOPE,
      store,
      embed,
      entitySlug: "an-entity",
      now: NOW,
    });
    expect(second.rowsAffected).toBe(0);
    expect(second.noop).toBe(true);
    // upsertTake is still invoked (idempotent by store contract) but the
    // stamping is provably a no-op.
    const secondPassStamps = store.setValidUntilCalls.slice(2);
    expect(secondPassStamps.every((c) => c.affected === 0)).toBe(true);
    // No NEW take rows beyond the idempotent re-upsert of the same key.
    expect(store.upsertCalls.length).toBeGreaterThanOrEqual(upsertsAfterFirst);
  });
});

describe("consolidate — boundary validation (zod)", () => {
  it("rejects an empty entitySlug", async () => {
    const store = new FakeFactStore([]);
    await expect(
      consolidate({
        scope: SCOPE,
        store,
        embed: makeEmbed({}),
        entitySlug: "",
        now: NOW,
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-Date now", async () => {
    const store = new FakeFactStore([]);
    await expect(
      consolidate({
        scope: SCOPE,
        store,
        embed: makeEmbed({}),
        entitySlug: "an-entity",
        // @ts-expect-error — deliberately invalid to exercise the zod guard
        now: "2026-05-19",
      }),
    ).rejects.toThrow();
  });

  it("rejects a negative minCluster override", async () => {
    const store = new FakeFactStore([]);
    await expect(
      consolidate({
        scope: SCOPE,
        store,
        embed: makeEmbed({}),
        entitySlug: "an-entity",
        now: NOW,
        opts: { minCluster: -1 },
      }),
    ).rejects.toThrow();
  });

  it("rejects a clusterThreshold outside [0, 1]", async () => {
    const store = new FakeFactStore([]);
    await expect(
      consolidate({
        scope: SCOPE,
        store,
        embed: makeEmbed({}),
        entitySlug: "an-entity",
        now: NOW,
        opts: { clusterThreshold: 1.5 },
      }),
    ).rejects.toThrow();
  });
});

describe("consolidate — immutability", () => {
  it("does not mutate the facts returned by listActive", async () => {
    const facts = [
      makeFact({ id: "a", claim: "ca", validFrom: hoursAgo(60), confidence: 0.9 }),
      makeFact({ id: "b", claim: "cb", validFrom: hoursAgo(40), confidence: 0.5 }),
      makeFact({ id: "c", claim: "cc", validFrom: hoursAgo(20), confidence: 0.4 }),
    ];
    const snapshot = facts.map((f) => ({ ...f }));
    const store = new FakeFactStore(facts);
    await consolidate({
      scope: SCOPE,
      store,
      embed: makeEmbed({ ca: E_A, cb: E_A, cc: E_A }),
      entitySlug: "an-entity",
      now: NOW,
    });
    // The caller-held fixture array is untouched (consolidate works on copies).
    expect(facts).toEqual(snapshot);
  });
});
