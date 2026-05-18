import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_EMBEDDING_DIMENSIONS,
  embedTextLocal,
  embedTextLocalFloat32,
  tokenizeLocalEmbeddingText,
} from "./index";

describe("local embedding primitive", () => {
  it("tokenizes Unicode words and numbers deterministically", () => {
    expect(tokenizeLocalEmbeddingText("Hello 世界 123")).toEqual(["hello", "世界", "123"]);
  });

  it("produces deterministic unit vectors with configurable dimensions", () => {
    const a = embedTextLocal("hello world", { dimensions: 64 });
    const b = embedTextLocal("hello world", { dimensions: 64 });
    expect(a).toHaveLength(64);
    expect(a).toEqual(b);
    expect(Math.sqrt(a.reduce((sum, value) => sum + value * value, 0))).toBeCloseTo(1, 5);
  });

  it("keeps semantically overlapping texts closer than unrelated texts", () => {
    const cat1 = embedTextLocal("the cat sat on the mat");
    const cat2 = embedTextLocal("a cat is on a mat");
    const finance = embedTextLocal("quarterly revenue and profit margins");
    const dot = (left: number[], right: number[]) =>
      left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
    expect(dot(cat1, cat2)).toBeGreaterThan(dot(cat1, finance));
  });

  it("supports Float32 output for binary vector stores", () => {
    const vector = embedTextLocalFloat32("content", {
      dimensions: DEFAULT_LOCAL_EMBEDDING_DIMENSIONS,
    });
    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector).toHaveLength(DEFAULT_LOCAL_EMBEDDING_DIMENSIONS);
  });
});
