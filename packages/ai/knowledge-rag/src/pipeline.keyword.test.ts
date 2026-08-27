import { describe, expect, it, vi } from "vitest";

// Inject a fake keyword index so the hybrid (vector + keyword) merge,
// keyword-leg doctor probe, and keyword deleteByDoc branches are exercised
// without any external @nebutra/search backend.
const kwState = {
  health: { ok: true, detail: "fake search ok" },
  hits: [] as Array<{ chunkId: string; docId: string; tenantId: string; score: number }>,
};

vi.mock("./keyword", () => {
  class FakeIndex {
    static async tryCreate() {
      return new FakeIndex();
    }
    async index() {}
    async search(tenantId: string) {
      return kwState.hits.filter((h) => h.tenantId === tenantId);
    }
    async deleteByDoc() {}
    async health() {
      return kwState.health;
    }
  }
  return { SearchKeywordIndex: FakeIndex };
});

const { createKnowledgeRag } = await import("./pipeline");
const { InMemoryVectorStore } = await import("./stores/memory");

describe("pipeline — hybrid keyword leg", () => {
  it("blends keyword scores into hybrid results", async () => {
    const kb = createKnowledgeRag({ vectorStore: new InMemoryVectorStore() });
    await kb.ingest({ id: "doc", tenantId: "org_a", text: "alpha beta gamma content" });
    kwState.hits = [{ chunkId: "doc::0", docId: "doc", tenantId: "org_a", score: 0.9 }];
    const out = await kb.query({ query: "alpha", tenantId: "org_a", topK: 3 });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.source).toBe("hybrid");
    expect(out[0]!.scores.keyword).toBeGreaterThan(0);
  });

  it("keyword hits from another tenant are dropped", async () => {
    const kb = createKnowledgeRag({ vectorStore: new InMemoryVectorStore() });
    await kb.ingest({ id: "d", tenantId: "org_a", text: "tenant a content here" });
    kwState.hits = [{ chunkId: "d::0", docId: "d", tenantId: "org_b", score: 0.9 }];
    const out = await kb.query({ query: "content", tenantId: "org_a", topK: 5 });
    for (const r of out) expect(r.chunk.tenantId).toBe("org_a");
  });

  it("doctor() reports the keyword backend health", async () => {
    kwState.health = { ok: true, detail: "fake search ok" };
    const kb = createKnowledgeRag({ vectorStore: new InMemoryVectorStore() });
    const report = await kb.doctor();
    expect(report.components.some((c) => c.name.includes("@nebutra/search") && c.ok)).toBe(true);
  });

  it("deleteByDoc also clears the keyword leg", async () => {
    const kb = createKnowledgeRag({ vectorStore: new InMemoryVectorStore() });
    await kb.ingest({ id: "d", tenantId: "org_a", text: "removable content" });
    const n = await kb.deleteByDoc("d", "org_a");
    expect(n).toBeGreaterThan(0);
  });
});
