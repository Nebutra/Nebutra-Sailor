import { describe, expect, it } from "vitest";
import { cosineSimilarity, hybridBlend, normalizeScores } from "./scoring";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("is 0 for a zero vector (no NaN)", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("throws on dimension mismatch with a suggestion", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrowError(/dimension/i);
  });
});

describe("normalizeScores", () => {
  it("maps to 0..1 with min→0 and max→1", () => {
    const n = normalizeScores([2, 4, 6]);
    expect(n[0]).toBeCloseTo(0);
    expect(n[2]).toBeCloseTo(1);
    expect(n[1]).toBeCloseTo(0.5);
  });

  it("returns all-1 when every score is equal (avoids divide by zero)", () => {
    expect(normalizeScores([5, 5, 5])).toEqual([1, 1, 1]);
  });

  it("handles empty input", () => {
    expect(normalizeScores([])).toEqual([]);
  });
});

describe("hybridBlend", () => {
  it("blends vector and keyword by weight", () => {
    // vectorWeight 0.6 → 0.6*1.0 + 0.4*0.0 = 0.6
    expect(hybridBlend(1, 0, 0.6)).toBeCloseTo(0.6);
    expect(hybridBlend(0, 1, 0.6)).toBeCloseTo(0.4);
    expect(hybridBlend(0.5, 0.5, 0.6)).toBeCloseTo(0.5);
  });

  it("clamps weight into [0,1]", () => {
    expect(hybridBlend(1, 0, 5)).toBeCloseTo(1);
    expect(hybridBlend(1, 0, -5)).toBeCloseTo(0);
  });
});
