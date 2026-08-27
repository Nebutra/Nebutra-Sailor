import { describe, expect, it } from "vitest";
import { clamp, cosineSimilarity, estimateTokens, scopedKey, sha256 } from "./index";

describe("@nebutra/ai-primitives", () => {
  it("owns deterministic sha256 hashing", () => {
    expect(sha256("nebutra")).toBe(
      "5762b51ff72d5d78761d2dce0fdb9e9dbd1cc8479472f26d56f3db2d0af2a7d8",
    );
  });

  it("derives prefixed scoped keys while preserving caller separators", () => {
    expect(scopedKey({ prefix: "ci", a: "tenant", b: "project", separator: "\0" })).toBe(
      `ci_${sha256("tenant\0project").slice(0, 32)}`,
    );
    expect(scopedKey({ prefix: "kg", a: "tenant", b: "source", separator: " " })).toBe(
      `kg_${sha256("tenant source").slice(0, 32)}`,
    );
  });

  it("rejects empty scoped key parts fail-closed", () => {
    expect(() => scopedKey({ prefix: "ci", a: " ", b: "project" })).toThrow(/non-empty/);
    expect(() => scopedKey({ prefix: "ci", a: "tenant", b: "" })).toThrow(/non-empty/);
  });

  it("clamps numeric values", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it("calculates cosine similarity and never returns NaN for zero vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [1, 1])).toBeCloseTo(1);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("keeps dimension-mismatch posture explicit", () => {
    expect(cosineSimilarity([1], [1, 2], { onMismatch: "zero" })).toBe(0);
    expect(() => cosineSimilarity([1], [1, 2], { onMismatch: "throw" })).toThrow(
      /dimension mismatch/i,
    );
  });

  it("estimates tokens with shared default correction and caller overrides", () => {
    expect(estimateTokens("abcdefgh")).toBe(3);
    expect(estimateTokens("ignored", { base: () => 10 })).toBe(13);
    expect(estimateTokens("abcd", { base: () => 1 })).toBe(2);
    expect(estimateTokens("abcdefgh", { correction: 1 })).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});
