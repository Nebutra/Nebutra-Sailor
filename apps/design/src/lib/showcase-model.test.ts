import { describe, expect, it } from "vitest";
import {
  type CardItem,
  EXPRESSIVE_AUDIT,
  filterItems,
  GRADUATION_CRITERIA,
  graduationGaps,
  MIN_CONSUMERS,
  sizeOf,
  statusOf,
  tierOf,
  widthStep,
} from "./showcase-model";

const entry = (over: Partial<Parameters<typeof tierOf>[0]> = {}) => ({
  id: "thing",
  category: "forms",
  status: "stable" as const,
  import: "@nebutra/ui/primitives",
  ...over,
});

const PASSING = {
  tokens: true,
  reducedMotion: true,
  staticFallback: true,
  budget: true,
  consumers: MIN_CONSUMERS,
  note: "fixture",
};

describe("tierOf", () => {
  it("puts stable primitives in Core", () => {
    expect(tierOf(entry())).toBe("core");
    expect(tierOf(entry({ category: "overlays" }))).toBe("core");
  });

  it("keeps experimental primitives in Core; the badge, not the tier, says so", () => {
    const e = entry({ status: "experimental", category: "navigation" });
    expect(tierOf(e)).toBe("core");
    expect(statusOf("core", e.status)).toBe("experimental");
  });

  it("treats page-level and multi-part compositions as Patterns", () => {
    expect(tierOf(entry({ import: "@nebutra/ui/patterns" }))).toBe("patterns");
    expect(tierOf(entry({ import: "@nebutra/ui/layout", category: "feedback" }))).toBe("patterns");
    expect(tierOf(entry({ category: "ai" }))).toBe("patterns");
    expect(tierOf(entry({ category: "charts" }))).toBe("patterns");
    expect(tierOf(entry({ category: "marketing", id: "pricing-card" }))).toBe("patterns");
  });

  it("never produces Blocks from the catalog; blocks are authored", () => {
    for (const category of ["actions", "forms", "ai", "effects", "marketing"]) {
      expect(tierOf(entry({ category }))).not.toBe("blocks");
    }
  });

  it("sends effects, text motion and media to Lab unless the audit passes", () => {
    for (const category of ["effects", "text-motion", "media"]) {
      expect(tierOf(entry({ category, id: "unaudited" }))).toBe("lab");
    }
    expect(tierOf(entry({ id: "magic-card", category: "marketing" }))).toBe("lab");
  });

  it("graduates an expressive entry only when every criterion is met and it is stable", () => {
    const e = entry({ category: "effects", id: "audited" });
    expect(tierOf(e, PASSING)).toBe("expressive");
    for (const criterion of GRADUATION_CRITERIA) {
      const failing = { ...PASSING, [criterion]: criterion === "consumers" ? 1 : null };
      expect(tierOf(e, failing)).toBe("lab");
    }
    expect(tierOf({ ...e, status: "experimental" }, PASSING)).toBe("lab");
  });
});

describe("statusOf", () => {
  it("never labels a Lab entry stable", () => {
    expect(statusOf("lab", "stable")).toBe("lab");
    expect(statusOf("lab", "experimental")).toBe("lab");
  });

  it("passes the catalog status through everywhere else", () => {
    expect(statusOf("core", "stable")).toBe("stable");
    expect(statusOf("patterns", "experimental")).toBe("experimental");
    expect(statusOf("expressive", "stable")).toBe("stable");
  });
});

describe("graduationGaps", () => {
  it("lists every criterion for an entry nobody audited", () => {
    expect(graduationGaps(undefined)).toEqual([...GRADUATION_CRITERIA]);
  });

  it("lists only what is missing", () => {
    expect(graduationGaps({ ...PASSING, consumers: 1, reducedMotion: false })).toEqual([
      "consumers",
      "reducedMotion",
    ]);
  });
});

describe("EXPRESSIVE_AUDIT", () => {
  it("names the evidence behind every entry", () => {
    for (const [id, audit] of Object.entries(EXPRESSIVE_AUDIT)) {
      expect(audit.note.length, `${id} needs a note naming its evidence`).toBeGreaterThan(10);
    }
  });

  it("graduates exactly AnimateIn and AuroraBackground today", () => {
    const graduates = Object.keys(EXPRESSIVE_AUDIT).filter(
      (id) => graduationGaps(EXPRESSIVE_AUDIT[id]).length === 0,
    );
    expect(graduates.sort()).toEqual(["animate-in", "aurora-background"]);
  });
});

describe("sizeOf", () => {
  it("bands a demo by its natural size", () => {
    expect(sizeOf({ w: 120, h: 40 })).toBe("S");
    expect(sizeOf({ w: 248, h: 184 })).toBe("S");
    expect(sizeOf({ w: 320, h: 120 })).toBe("M");
    expect(sizeOf({ w: 120, h: 260 })).toBe("M");
    expect(sizeOf({ w: 560, h: 300 })).toBe("L");
    expect(sizeOf({ w: 400, h: 420 })).toBe("L");
  });

  it("never shrinks: anything past L is an entry card", () => {
    expect(sizeOf({ w: 400, h: 700 })).toBe("entry");
    expect(sizeOf({ w: 1200, h: 100 })).toBe("entry");
  });

  it("does not guess for a demo nobody measured", () => {
    expect(sizeOf(undefined)).toBe("entry");
  });
});

describe("widthStep", () => {
  it("rounds the card width a demo needs up to a fixed step", () => {
    expect(widthStep(120)).toBe(200);
    expect(widthStep(248)).toBe(280);
    expect(widthStep(249)).toBe(320);
    expect(widthStep(560)).toBeGreaterThanOrEqual(592);
  });
});

const item = (over: Partial<CardItem>): CardItem => ({
  id: "x",
  title: "X",
  tier: "core",
  status: "stable",
  category: "Forms",
  ...over,
});

describe("filterItems", () => {
  const items = [
    item({ id: "button", title: "Button", category: "Actions" }),
    item({ id: "date-picker", title: "Date Picker", category: "Forms" }),
    item({ id: "pricing-card", title: "Pricing Card", tier: "patterns", status: "experimental" }),
    item({ id: "aurora-text", title: "Aurora Text", tier: "lab", status: "lab" }),
  ];

  it("returns everything for an empty filter", () => {
    expect(filterItems(items, { tier: "all", status: "all", query: "" })).toHaveLength(4);
  });

  it("filters by tier and status independently", () => {
    expect(filterItems(items, { tier: "patterns", status: "all", query: "" })).toHaveLength(1);
    expect(filterItems(items, { tier: "all", status: "lab", query: "" })).toHaveLength(1);
    expect(filterItems(items, { tier: "core", status: "experimental", query: "" })).toHaveLength(0);
  });

  it("searches title, id and category, ignoring case and extra spaces", () => {
    expect(filterItems(items, { tier: "all", status: "all", query: "  PICK " })).toHaveLength(1);
    expect(filterItems(items, { tier: "all", status: "all", query: "actions" })).toHaveLength(1);
    expect(filterItems(items, { tier: "all", status: "all", query: "date-picker" })).toHaveLength(
      1,
    );
  });

  it("requires every word of the query to match", () => {
    expect(filterItems(items, { tier: "all", status: "all", query: "pricing card" })).toHaveLength(
      1,
    );
    expect(
      filterItems(items, { tier: "all", status: "all", query: "pricing button" }),
    ).toHaveLength(0);
  });
});
