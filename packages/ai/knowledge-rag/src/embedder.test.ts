import { describe, expect, it } from "vitest";
import { LocalHashEmbedder } from "./embedder";

describe("LocalHashEmbedder", () => {
  it("produces fixed-length deterministic vectors (non-mock, zero-config)", async () => {
    const e = new LocalHashEmbedder(64);
    const [a] = await e.embed(["hello world"]);
    const [b] = await e.embed(["hello world"]);
    expect(a).toHaveLength(64);
    expect(a).toEqual(b);
  });

  it("returns unit-norm vectors", async () => {
    const e = new LocalHashEmbedder(32);
    const [v] = await e.embed(["the quick brown fox"]);
    const norm = Math.sqrt(v!.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("semantically-similar texts are closer than unrelated ones", async () => {
    const e = new LocalHashEmbedder(256);
    const [cat1, cat2, finance] = await e.embed([
      "the cat sat on the mat",
      "a cat is on a mat",
      "quarterly revenue and profit margins",
    ]);
    const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i]!, 0);
    expect(dot(cat1!, cat2!)).toBeGreaterThan(dot(cat1!, finance!));
  });

  it("batches independently", async () => {
    const e = new LocalHashEmbedder(16);
    const out = await e.embed(["one", "two", "three"]);
    expect(out).toHaveLength(3);
  });
});
