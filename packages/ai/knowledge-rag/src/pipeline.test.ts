import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeRag } from "./pipeline";
import { InMemoryVectorStore } from "./stores/memory";
import type { KnowledgeRag } from "./types";

// Zero-config: in-memory store + local hash embedder, keyword leg disabled
// (no @nebutra/search backend in unit env).
function makeKb(): KnowledgeRag {
  return createKnowledgeRag({
    vectorStore: new InMemoryVectorStore(),
    disableKeyword: true,
  });
}

describe("knowledge-rag pipeline", () => {
  let kb: KnowledgeRag;
  beforeEach(() => {
    kb = makeKb();
  });

  it("ingest → query roundtrip returns the relevant chunk (local embedder)", async () => {
    await kb.ingest({
      id: "doc1",
      tenantId: "org_a",
      text: "Nebutra Sailor supports multi-tenant retrieval augmented generation. The cat sat on the mat.",
    });
    const results = await kb.query({
      query: "multi-tenant retrieval augmented generation",
      tenantId: "org_a",
      topK: 3,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.chunk.docId).toBe("doc1");
    expect(results[0]!.chunk.tenantId).toBe("org_a");
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it("CRITICAL: tenant A query never returns tenant B chunks", async () => {
    await kb.ingest({
      id: "secret-b",
      tenantId: "org_b",
      text: "Tenant B confidential roadmap: launching project phoenix next quarter.",
    });
    await kb.ingest({
      id: "pub-a",
      tenantId: "org_a",
      text: "Tenant A public docs about onboarding.",
    });

    const asA = await kb.query({
      query: "confidential roadmap project phoenix",
      tenantId: "org_a",
      topK: 10,
    });
    for (const r of asA) {
      expect(r.chunk.tenantId).toBe("org_a");
      expect(r.chunk.docId).not.toBe("secret-b");
    }

    const asB = await kb.query({
      query: "confidential roadmap project phoenix",
      tenantId: "org_b",
      topK: 10,
    });
    expect(asB.some((r) => r.chunk.docId === "secret-b")).toBe(true);
  });

  it("deleteByDoc only removes the scoped tenant's doc", async () => {
    await kb.ingest({ id: "d", tenantId: "org_a", text: "alpha content here" });
    await kb.ingest({ id: "d", tenantId: "org_b", text: "beta content here" });

    const removed = await kb.deleteByDoc("d", "org_a");
    expect(removed).toBeGreaterThan(0);

    const a = await kb.query({ query: "alpha", tenantId: "org_a", topK: 5 });
    expect(a).toHaveLength(0);
    const b = await kb.query({ query: "beta", tenantId: "org_b", topK: 5 });
    expect(b.length).toBeGreaterThan(0);
  });

  it("rejects ingest without tenantId", async () => {
    await expect(
      // @ts-expect-error — intentionally invalid
      kb.ingest({ id: "x", text: "no tenant" }),
    ).rejects.toThrow(/tenant/i);
  });

  it("doctor() returns a structured report quickly", async () => {
    const start = Date.now();
    const report = await kb.doctor();
    expect(Date.now() - start).toBeLessThan(3000);
    expect(report).toHaveProperty("ok");
    expect(Array.isArray(report.components)).toBe(true);
    expect(report.components.some((c) => c.name.includes("vector"))).toBe(true);
  });

  it("respects topK", async () => {
    const big = Array.from({ length: 20 }, (_, i) => `sentence number ${i} about widgets`).join(
      ". ",
    );
    await kb.ingest({ id: "big", tenantId: "org_a", text: big });
    const r = await kb.query({ query: "widgets", tenantId: "org_a", topK: 2 });
    expect(r.length).toBeLessThanOrEqual(2);
  });
});
