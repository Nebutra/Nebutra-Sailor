import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import zhHans from "../../../messages/zh-Hans.json";
import zhHant from "../../../messages/zh-Hant.json";
import {
  getAllSolutionSlugs,
  getGroupSolutions,
  getSolution,
  SOLUTION_GROUPS,
  SOLUTIONS,
} from "./solutions-data";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const GROUP_IDS = new Set(SOLUTION_GROUPS.map((g) => g.id));

const CATALOGS = [
  ["en", en],
  ["zh-Hans", zhHans],
  ["zh-Hant", zhHant],
] as const;

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
});

describe("solutions catalog copy (messages/*.json)", () => {
  it("has non-empty label and tagline for every solution, in every shipped catalog", () => {
    for (const [locale, messages] of CATALOGS) {
      for (const slug of getAllSolutionSlugs()) {
        const entry =
          messages.solutionsCatalog.solutions[slug as keyof typeof en.solutionsCatalog.solutions];
        expect(entry, `${locale}: solutions.${slug}`).toBeTruthy();
        expect(entry.label.trim(), `${locale}: solutions.${slug}.label`).not.toBe("");
        expect(entry.tagline.trim(), `${locale}: solutions.${slug}.tagline`).not.toBe("");
      }
    }
  });

  it("has complete hero copy and at least one use case + FAQ entry, in every shipped catalog", () => {
    for (const [locale, messages] of CATALOGS) {
      for (const slug of getAllSolutionSlugs()) {
        const entry =
          messages.solutionsCatalog.solutions[slug as keyof typeof en.solutionsCatalog.solutions];
        for (const field of [
          entry.hero.eyebrow,
          entry.hero.title,
          entry.hero.titleAccent,
          entry.hero.summary,
        ]) {
          expect(field.trim(), `${locale}: solutions.${slug}.hero`).not.toBe("");
        }
        expect(
          Object.keys(entry.useCases).length,
          `${locale}: solutions.${slug}.useCases`,
        ).toBeGreaterThan(0);
        expect(Object.keys(entry.faq).length, `${locale}: solutions.${slug}.faq`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("has a label for every solution group, in every shipped catalog", () => {
    for (const [locale, messages] of CATALOGS) {
      for (const group of SOLUTION_GROUPS) {
        const entry =
          messages.solutionsCatalog.groups[group.id as keyof typeof en.solutionsCatalog.groups];
        expect(entry, `${locale}: groups.${group.id}`).toBeTruthy();
        expect(entry.label.trim(), `${locale}: groups.${group.id}.label`).not.toBe("");
      }
    }
  });
});
