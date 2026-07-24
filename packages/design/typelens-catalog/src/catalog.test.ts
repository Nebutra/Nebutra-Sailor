import { describe, expect, it } from "vitest";
import {
  checkLicenses,
  getWork,
  listTypefaces,
  listWorks,
  SPECIMENS,
  SpecimenSchema,
  searchSpecimens,
  TYPEFACES,
  TypefaceSchema,
  WORKS,
  WorkSchema,
} from "./index";

describe("catalog integrity", () => {
  it("commercial free typefaces", () => {
    expect(TYPEFACES.length).toBeGreaterThanOrEqual(15);
    for (const t of TYPEFACES) {
      expect(() => TypefaceSchema.parse(t)).not.toThrow();
      expect(t.license.commercialOk).toBe(true);
    }
  });
  it("latin + cjk", () => {
    const s = new Set(TYPEFACES.flatMap((t) => t.scripts));
    expect(s.has("latin")).toBe(true);
    expect(s.has("cjk-hans")).toBe(true);
  });
  it("works mixed media published", () => {
    expect(WORKS.length).toBeGreaterThanOrEqual(12);
    const media = new Set(WORKS.map((w) => w.medium));
    expect(media.has("poster")).toBe(true);
    expect(media.has("website")).toBe(true);
    const published = WORKS.filter((w) => w.status === "published");
    expect(published.length).toBeGreaterThanOrEqual(6);
    for (const w of WORKS) {
      expect(() => WorkSchema.parse(w)).not.toThrow();
      expect(["draft", "parsed", "human_reviewed", "published"]).toContain(w.status);
    }
  });
  it("specimen graph", () => {
    expect(SPECIMENS.length).toBe(WORKS.length);
    const workIds = new Set(WORKS.map((w) => w.id));
    const tfIds = new Set(TYPEFACES.map((t) => t.id));
    for (const s of SPECIMENS) {
      expect(() => SpecimenSchema.parse(s)).not.toThrow();
      expect(workIds.has(s.workId)).toBe(true);
      for (const r of s.typefaces) expect(tfIds.has(r.typefaceId)).toBe(true);
    }
  });
  it("cold-start free commercial entries exist", () => {
    expect(TYPEFACES.some((t) => t.id === "playfair-display")).toBe(true);
    expect(WORKS.some((w) => w.slug.startsWith("fiu-") || w.slug.startsWith("free-"))).toBe(true);
    expect(
      SPECIMENS.some((s) => s.tags.includes("fiu-coldstart") || s.tags.includes("coldstart")),
    ).toBe(true);
  });
});
describe("query", () => {
  it("filters and search", () => {
    expect(listTypefaces({ script: "cjk-hans" }).length).toBeGreaterThan(0);
    expect(listWorks({ medium: "poster" }).every((w) => w.medium === "poster")).toBe(true);
    expect(getWork("calm-saas-landing")?.id).toBe("work-calm-saas-landing");
    expect(searchSpecimens({ tag: "bilingual", medium: "poster" }).length).toBeGreaterThan(0);
    expect(searchSpecimens({ query: "控制台" }).some((s) => s.id === "spec-zh-dashboard-ui")).toBe(
      true,
    );
    expect(checkLicenses(["inter", "x"])[0]?.commercialOk).toBe(true);
    expect(checkLicenses(["inter", "x"])[1]?.found).toBe(false);
  });
});
