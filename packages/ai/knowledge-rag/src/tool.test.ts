import { beforeEach, describe, expect, it } from "vitest";
import { resetKnowledgeRag } from "./index";
import { InMemoryVectorStore } from "./stores/memory";
import { createKnowledgeRagTool } from "./tool";

describe("createKnowledgeRagTool", () => {
  beforeEach(() => resetKnowledgeRag());

  it("throws without a tenant binding (security)", () => {
    expect(() => createKnowledgeRagTool("")).toThrowError(/tenantId/i);
  });

  it("binds tenantId and never crosses tenants", async () => {
    const cfg = { vectorStore: new InMemoryVectorStore(), disableKeyword: true };
    const { getKnowledgeRag } = await import("./index");
    const kb = await getKnowledgeRag(cfg);
    await kb.ingest({ id: "a1", tenantId: "org_a", text: "alpha onboarding guide" });
    await kb.ingest({ id: "b1", tenantId: "org_b", text: "alpha onboarding guide" });

    const tool = createKnowledgeRagTool("org_a", cfg);
    expect(tool.name).toBe("knowledge_search");
    const res = await tool.execute({ query: "onboarding", topK: 5 });
    expect(res.results.length).toBeGreaterThan(0);
    for (const r of res.results) {
      expect(r.docId).toBe("a1");
    }
  });

  it("defaults topK to 5", async () => {
    const cfg = { vectorStore: new InMemoryVectorStore(), disableKeyword: true };
    const { getKnowledgeRag } = await import("./index");
    const kb = await getKnowledgeRag(cfg);
    const big = Array.from({ length: 20 }, (_, i) => `widget item ${i}`).join(". ");
    await kb.ingest({ id: "d", tenantId: "org_a", text: big });
    const tool = createKnowledgeRagTool("org_a", cfg);
    const res = await tool.execute({ query: "widget" });
    expect(res.results.length).toBeLessThanOrEqual(5);
  });
});
