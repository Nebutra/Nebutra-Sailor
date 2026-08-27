import { describe, expect, it, vi } from "vitest";
import { ProviderEmbedder } from "./embedder";
import { createKnowledgeRag } from "./pipeline";
import { InMemoryVectorStore } from "./stores/memory";

vi.mock("@nebutra/agents", () => ({
  embedMany: vi.fn(async (texts: string[]) => ({
    embeddings: texts.map(() => [0.1, 0.2, 0.3]),
  })),
}));

describe("pipeline — edge & branch coverage", () => {
  it("ingest of whitespace-only text yields 0 chunks (no embed call)", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      disableKeyword: true,
    });
    const r = await kb.ingest({ id: "blank", tenantId: "org_a", text: "   \n  " });
    expect(r.chunks).toBe(0);
  });

  it("query against an empty store returns []", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      disableKeyword: true,
    });
    expect(await kb.query({ query: "anything", tenantId: "org_a" })).toEqual([]);
  });

  it("invalid query input throws with a suggestion", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      disableKeyword: true,
    });
    await expect(
      // @ts-expect-error invalid
      kb.query({ query: "", tenantId: "" }),
    ).rejects.toMatchObject({ code: "E_QUERY_INPUT" });
  });

  it("deleteByDoc rejects missing args with a suggestion", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      disableKeyword: true,
    });
    await expect(kb.deleteByDoc("", "org_a")).rejects.toMatchObject({
      code: "E_DELETE_INPUT",
    });
  });

  it("doctor() reports provider embedder + disabled keyword", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      embedder: new ProviderEmbedder(),
      disableKeyword: true,
    });
    const report = await kb.doctor();
    expect(report.ok).toBe(true);
    expect(report.components.some((c) => c.name.includes("nebutra-agents"))).toBe(true);
    expect(report.components.some((c) => c.detail.includes("disabled by config"))).toBe(true);
    expect(report.durationMs).toBeLessThan(3000);
  });

  it("deleteByDoc on a non-existent tenant returns 0", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      disableKeyword: true,
    });
    expect(await kb.deleteByDoc("nope", "ghost_tenant")).toBe(0);
  });

  it("doctor() surfaces an unhealthy vector store", async () => {
    const failing = {
      name: "flaky",
      upsert: async () => {},
      queryByVector: async () => [],
      deleteByDoc: async () => 0,
      health: async () => ({ ok: false, detail: "disk full" }),
    };
    const kb = createKnowledgeRag({ vectorStore: failing, disableKeyword: true });
    const report = await kb.doctor();
    expect(report.ok).toBe(false);
    expect(report.components.some((c) => c.name.includes("flaky") && !c.ok)).toBe(true);
  });

  it("doctor() handles a hanging vector-store health probe via timeout", async () => {
    const hanging = {
      name: "slow",
      upsert: async () => {},
      queryByVector: async () => [],
      deleteByDoc: async () => 0,
      health: () => new Promise<{ ok: boolean; detail: string }>(() => {}),
    };
    const kb = createKnowledgeRag({ vectorStore: hanging, disableKeyword: true });
    const start = Date.now();
    const report = await kb.doctor();
    expect(Date.now() - start).toBeLessThan(3000);
    expect(report.components.some((c) => c.name.includes("slow") && !c.ok)).toBe(true);
  });

  it("roundtrip with provider embedder + custom vectorWeight", async () => {
    const kb = createKnowledgeRag({
      vectorStore: new InMemoryVectorStore(),
      embedder: new ProviderEmbedder(),
      disableKeyword: true,
      vectorWeight: 0.7,
    });
    await kb.ingest({ id: "p", tenantId: "org_a", text: "some content to embed" });
    const out = await kb.query({ query: "content", tenantId: "org_a", topK: 3 });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.source).toBe("vector");
  });
});
