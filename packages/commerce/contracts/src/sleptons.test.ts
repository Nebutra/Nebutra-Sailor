import { describe, expect, it } from "vitest";
import { RESUME_CONTENT_VERSION, ResumeContentV1Schema, ResumeWriteSchema } from "./sleptons";

describe("ResumeContentV1Schema", () => {
  it("accepts a minimal résumé and fills defaults", () => {
    const parsed = ResumeContentV1Schema.parse({ basic: { name: "Zhang Wei" } });
    expect(parsed.version).toBe(RESUME_CONTENT_VERSION);
    expect(parsed.objective).toEqual({});
    expect(parsed.preferences.paper).toBe("A4");
    expect(parsed.preferences.margins.top).toBe("12mm");
    expect(parsed.preferences.show_contact_public).toBe(false);
  });

  it("defaults experience kind to work", () => {
    const parsed = ResumeContentV1Schema.parse({
      basic: { name: "A" },
      experiences: [{ period: "2024", org: "Acme", title: "Eng" }],
    });
    expect(parsed.experiences?.[0]?.kind).toBe("work");
  });

  it("rejects an empty name, bad email, and more than 8 advantage tags", () => {
    expect(ResumeContentV1Schema.safeParse({ basic: { name: "" } }).success).toBe(false);
    expect(ResumeContentV1Schema.safeParse({ basic: { name: "A", email: "nope" } }).success).toBe(
      false,
    );
    expect(
      ResumeContentV1Schema.safeParse({
        basic: { name: "A" },
        objective: { advantage_tags: Array.from({ length: 9 }, (_, i) => `t${i}`) },
      }).success,
    ).toBe(false);
  });

  it("rejects a wrong content version", () => {
    expect(ResumeContentV1Schema.safeParse({ version: 2, basic: { name: "A" } }).success).toBe(
      false,
    );
  });

  it("only allows known skill categories", () => {
    const res = ResumeContentV1Schema.safeParse({
      basic: { name: "A" },
      skills: { programming: ["TypeScript"], unknown_cat: ["x"] },
    });
    // unknown keys are stripped by default, never persisted
    expect(res.success).toBe(true);
    expect(res.success && "unknown_cat" in (res.data.skills ?? {})).toBe(false);
  });
});

describe("ResumeWriteSchema", () => {
  it("wraps content with optional visibility and language", () => {
    const parsed = ResumeWriteSchema.parse({
      content: { basic: { name: "A" } },
      is_public: true,
      language: "EN",
    });
    expect(parsed.is_public).toBe(true);
    expect(parsed.language).toBe("EN");
  });
});
