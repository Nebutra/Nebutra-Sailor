import { ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import { describe, expect, it } from "vitest";
import {
  canonicalSkill,
  deriveCompleteness,
  deriveHeadline,
  deriveHighlights,
  deriveResume,
  deriveSkillsFlat,
  deriveYearsActive,
} from "../../lib/resume/derive";

const full = ResumeContentV1Schema.parse({
  basic: { name: "Zhang Wei", email: "z@example.com", links: { github: "zw" } },
  objective: {
    summary: "<p>AI contract review for SMBs. Second sentence.</p>",
    advantage_tags: ["legal"],
  },
  ventures: [
    {
      name: "LexBot",
      role: "Founder",
      period: "2023.03 – now",
      stage: "launched",
      outcome: "Reached 1,200 paying SMBs in 9 months",
      details: ["Built the Next.js front end and Python pipeline"],
    },
  ],
  experiences: [
    {
      kind: "work",
      period: "2020 – 2023",
      org: "Acme",
      title: "Engineer",
      details: ["Shipped billing with Stripe"],
    },
  ],
  education: [{ school: "Fudan", major: "CS", degree: "BSc" }],
  projects: [{ name: "Side", details: ["Grew to 300 stars"] }],
  skills: { programming: ["Go", "python"], ai_engineering: ["LangChain", "my-own-thing"] },
  achievements: [{ title: "Hackathon winner" }],
  press: [{ title: "Featured on 36Kr" }],
});

describe("canonicalSkill", () => {
  it("normalizes case against TECH_STACK_OPTIONS and rejects unknowns", () => {
    expect(canonicalSkill("python")).toBe("Python");
    expect(canonicalSkill(" next.js ")).toBe("Next.js");
    expect(canonicalSkill("my-own-thing")).toBeNull();
  });
});

describe("deriveHeadline", () => {
  it("takes the first sentence of the summary, html stripped, ≤120 chars", () => {
    expect(deriveHeadline(full)).toBe("AI contract review for SMBs.");
  });
  it("falls back to venture, then experience, then null", () => {
    const noSummary = { ...full, objective: {} };
    expect(deriveHeadline(noSummary)).toBe("Founder · LexBot");
    const noVenture = { ...noSummary, ventures: undefined };
    expect(deriveHeadline(noVenture)).toBe("Engineer · Acme");
    expect(deriveHeadline({ ...noVenture, experiences: undefined })).toBeNull();
  });
});

describe("deriveSkillsFlat", () => {
  it("flattens categories and keeps only canonical values", () => {
    expect(deriveSkillsFlat(full).sort()).toEqual(["Go", "LangChain", "Python"].sort());
  });
});

describe("deriveYearsActive", () => {
  it("uses the earliest year across ventures and experiences", () => {
    expect(deriveYearsActive(full, new Date("2026-09-07"))).toBe(6);
    expect(deriveYearsActive({ ...full, ventures: undefined, experiences: undefined })).toBeNull();
  });
});

describe("deriveHighlights", () => {
  it("ranks numeric, founder-kind and canonical-skill bullets first, max 3", () => {
    const h = deriveHighlights(full);
    expect(h).toHaveLength(3);
    expect(h[0]).toBe("Reached 1,200 paying SMBs in 9 months");
    expect(h).not.toContain("Shipped billing with Stripe"); // 0 + skill 1 + first-entry 1 = 2 < others
  });
  it("returns [] for an empty résumé", () => {
    expect(deriveHighlights(ResumeContentV1Schema.parse({ basic: { name: "A" } }))).toEqual([]);
  });
});

describe("deriveCompleteness", () => {
  it("is 100 for a fully populated résumé and low for name-only", () => {
    expect(deriveCompleteness(full)).toBe(100);
    expect(deriveCompleteness(ResumeContentV1Schema.parse({ basic: { name: "A" } }))).toBe(9);
  });
});

describe("deriveResume", () => {
  it("bundles all derived columns", () => {
    const d = deriveResume(full, new Date("2026-09-07"));
    expect(d).toMatchObject({
      headline: "AI contract review for SMBs.",
      years_active: 6,
      completeness: 100,
    });
    expect(d.highlights).toHaveLength(3);
  });
});
