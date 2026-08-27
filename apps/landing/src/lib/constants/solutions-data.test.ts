import { describe, expect, it } from "vitest";
import {
  getAllSolutionSlugs,
  getGroupSolutions,
  getSolution,
  pick,
  SOLUTION_GROUPS,
  SOLUTIONS,
} from "./solutions-data";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const GROUP_IDS = new Set(SOLUTION_GROUPS.map((g) => g.id));

describe("solutions taxonomy integrity", () => {
  it("has unique, well-formed slugs", () => {
    const slugs = SOLUTIONS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG_RE);
  });

  it("declares a valid type for every solution", () => {
    for (const s of SOLUTIONS) {
      expect(["content", "offering"]).toContain(s.type);
    }
  });

  it("has non-empty en + zh label and tagline for every solution", () => {
    for (const s of SOLUTIONS) {
      expect(s.label.en.trim()).not.toBe("");
      expect(s.label.zh.trim()).not.toBe("");
      expect(s.tagline.en.trim()).not.toBe("");
      expect(s.tagline.zh.trim()).not.toBe("");
    }
  });

  it("has complete bilingual hero copy for every solution", () => {
    for (const s of SOLUTIONS) {
      for (const field of [s.hero.eyebrow, s.hero.title, s.hero.titleAccent, s.hero.summary]) {
        expect(field.en.trim()).not.toBe("");
        expect(field.zh.trim()).not.toBe("");
      }
      expect(s.useCases.length).toBeGreaterThan(0);
      expect(s.faq.length).toBeGreaterThan(0);
    }
  });

  it("points every solution at a declared group", () => {
    for (const s of SOLUTIONS) expect(GROUP_IDS.has(s.groupId)).toBe(true);
  });

  it("partitions all solutions across groups exactly once", () => {
    const fromGroups = SOLUTION_GROUPS.flatMap((g) => g.solutionSlugs);
    expect(new Set(fromGroups).size).toBe(fromGroups.length);
    expect([...fromGroups].sort()).toEqual([...getAllSolutionSlugs()].sort());
  });

  it("resolves group solutions in declared order", () => {
    for (const g of SOLUTION_GROUPS) {
      const resolved = getGroupSolutions(g).map((s) => s.slug);
      expect(resolved).toEqual(g.solutionSlugs);
    }
  });
});

describe("solution lookup helpers", () => {
  it("getSolution resolves every slug and rejects unknown ones", () => {
    for (const slug of getAllSolutionSlugs()) {
      expect(getSolution(slug)?.slug).toBe(slug);
    }
    expect(getSolution("does-not-exist")).toBeUndefined();
  });

  it("pick falls back to English for non-zh locales", () => {
    const copy = { en: "Hello", zh: "你好" };
    expect(pick(copy, "zh")).toBe("你好");
    expect(pick(copy, "en")).toBe("Hello");
    expect(pick(copy, "ja")).toBe("Hello");
  });
});
