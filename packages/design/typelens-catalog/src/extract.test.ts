import { describe, expect, it } from "vitest";
import { AgentExtractPackSchema, extractSpecimen, listSpecimens, SPECIMENS } from "./index";

describe("extractSpecimen", () => {
  it("packs all specimens", () => {
    for (const s of SPECIMENS) {
      const pack = extractSpecimen(s.id);
      expect(() => AgentExtractPackSchema.parse(pack)).not.toThrow();
      expect(pack.schemaVersion).toBe(1);
      expect(pack.licenses.every((l) => l.commercialOk)).toBe(true);
    }
  });
  it("calm saas", () => {
    const pack = extractSpecimen("spec-calm-saas-landing");
    expect(pack.pairing.display?.family).toBe("Fraunces");
    expect(pack.pairing.body?.family).toBe("Source Sans 3");
  });
  it("bilingual poster", () => {
    const pack = extractSpecimen("spec-bilingual-brand-poster");
    expect(pack.scripts).toContain("cjk-hans");
    expect(pack.pairing.display?.typefaceId).toBe("noto-serif-sc");
  });
  it("throws unknown", () => {
    expect(() => extractSpecimen("nope")).toThrow(/not found/i);
  });
  it("list length", () => {
    expect(listSpecimens().length).toBe(SPECIMENS.length);
  });
});
