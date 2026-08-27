import { describe, expect, it } from "vitest";
import { IdentityReranker, LexicalOverlapReranker } from "./reranker";
import type { RankedChunk } from "./types";

function mk(id: string, text: string, score: number): RankedChunk {
  return {
    chunk: {
      id,
      docId: id,
      tenantId: "org_a",
      text,
      ordinal: 0,
      embedding: [],
      meta: {},
    },
    score,
    scores: { vector: score, keyword: 0 },
    source: "vector",
  };
}

describe("IdentityReranker", () => {
  it("preserves order", async () => {
    const r = new IdentityReranker();
    const input = [mk("a", "x", 0.9), mk("b", "y", 0.1)];
    expect(await r.rerank("q", input)).toBe(input);
    expect(r.name).toBe("identity");
  });
});

describe("LexicalOverlapReranker", () => {
  it("boosts candidates containing query terms", async () => {
    const r = new LexicalOverlapReranker(0.8);
    const input = [
      mk("a", "nothing relevant here", 0.6),
      mk("b", "project phoenix roadmap details", 0.5),
    ];
    const out = await r.rerank("project phoenix roadmap", input);
    expect(out[0]!.chunk.id).toBe("b");
  });

  it("returns candidates unchanged when query has no terms", async () => {
    const r = new LexicalOverlapReranker();
    const input = [mk("a", "x", 0.6)];
    expect(await r.rerank("   ", input)).toBe(input);
  });

  it("clamps weight into [0,1]", async () => {
    const r = new LexicalOverlapReranker(5);
    const out = await r.rerank("x", [mk("a", "x", 0.5)]);
    expect(out[0]!.score).toBeGreaterThanOrEqual(0);
    expect(out[0]!.score).toBeLessThanOrEqual(1);
  });
});
