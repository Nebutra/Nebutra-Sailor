import { describe, expect, it, vi } from "vitest";
import { ProviderEmbedder } from "./embedder";
import { KnowledgeRagError } from "./errors";

vi.mock("@nebutra/agents", () => ({
  embedMany: vi.fn(async (texts: string[]) => {
    if (texts.includes("__boom__")) throw new Error("provider down");
    if (texts.includes("__badshape__")) return { embeddings: [[1, 2]] };
    return { embeddings: texts.map(() => [0.1, 0.2, 0.3]) };
  }),
}));

describe("ProviderEmbedder", () => {
  it("wraps @nebutra/agents embedMany and returns vectors", async () => {
    const e = new ProviderEmbedder();
    const out = await e.embed(["a", "b"]);
    expect(e.name).toBe("nebutra-agents");
    expect(out).toEqual([
      [0.1, 0.2, 0.3],
      [0.1, 0.2, 0.3],
    ]);
  });

  it("passes a custom model through", async () => {
    const { embedMany } = await import("@nebutra/agents");
    const e = new ProviderEmbedder("embedding-large");
    await e.embed(["x"]);
    expect(embedMany).toHaveBeenCalledWith(["x"], { model: "embedding-large" });
  });

  it("throws a KnowledgeRagError with a suggestion on provider failure", async () => {
    const e = new ProviderEmbedder();
    await expect(e.embed(["__boom__"])).rejects.toMatchObject({
      name: "KnowledgeRagError",
      code: "E_EMBED_PROVIDER",
    });
  });

  it("throws on an unexpected embedding shape", async () => {
    const e = new ProviderEmbedder();
    try {
      await e.embed(["__badshape__", "second"]);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(KnowledgeRagError);
      expect((err as KnowledgeRagError).code).toBe("E_EMBED_SHAPE");
    }
  });
});
