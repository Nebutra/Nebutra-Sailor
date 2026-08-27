import { describe, expect, it } from "vitest";
import {
  CHINA_VC_COUNT,
  CHINA_VC_LOGO_IDS,
  CHINA_VC_ORGS,
  CHINA_VC_SECTORS,
  CHINA_VC_TYPES,
} from "./china-vc";
import {
  GLOBAL_VC_LOGO_IDS,
  GLOBAL_VC_ORGS,
  GLOBAL_VC_REGIONS,
  GLOBAL_VC_SECTORS,
  GLOBAL_VC_TYPES,
} from "./global-vc";

const FORBIDDEN_CONTACT_KEYS = ["phone", "email", "tel", "公开电话", "机构邮箱"];

describe("China VC dataset", () => {
  it("has institutions with facets", () => {
    expect(CHINA_VC_COUNT).toBeGreaterThan(400);
    expect(CHINA_VC_SECTORS.length).toBeGreaterThan(0);
    expect(CHINA_VC_TYPES.length).toBeGreaterThan(0);
  });

  it("has unique ids and required fields per org", () => {
    const ids = CHINA_VC_ORGS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of CHINA_VC_ORGS) {
      expect(o.name.trim()).not.toBe("");
      expect(o.website.startsWith("http")).toBe(true);
      expect(o.sectors.length).toBeGreaterThan(0);
    }
  });

  it("never exposes contact details (compliance)", () => {
    for (const o of CHINA_VC_ORGS.slice(0, 50)) {
      for (const key of FORBIDDEN_CONTACT_KEYS) {
        expect(key in (o as unknown as Record<string, unknown>)).toBe(false);
      }
    }
  });

  it("only maps logo ids that exist in the dataset", () => {
    const ids = new Set(CHINA_VC_ORGS.map((o) => o.id));
    for (const id of CHINA_VC_LOGO_IDS) expect(ids.has(id)).toBe(true);
  });
});

describe("Global VC dataset", () => {
  it("has unique ids and complete profiles", () => {
    const ids = GLOBAL_VC_ORGS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(GLOBAL_VC_ORGS.length).toBeGreaterThan(20);
    for (const o of GLOBAL_VC_ORGS) {
      expect(o.name.trim()).not.toBe("");
      expect(o.website.startsWith("http")).toBe(true);
      expect(o.region).toBeTruthy();
      expect(o.founded).toBeGreaterThan(1900);
      expect(o.sectors.length).toBeGreaterThan(0);
      expect(o.types.length).toBeGreaterThan(0);
    }
  });

  it("does not carry fabricated deal metrics", () => {
    for (const o of GLOBAL_VC_ORGS) {
      expect(o.total).toBeUndefined();
      expect(o.y2024).toBeUndefined();
    }
  });

  it("derives non-empty facet lists", () => {
    expect(GLOBAL_VC_SECTORS.length).toBeGreaterThan(0);
    expect(GLOBAL_VC_TYPES.length).toBeGreaterThan(0);
    expect(GLOBAL_VC_REGIONS.length).toBeGreaterThan(0);
  });

  it("only maps logo ids that exist in the dataset", () => {
    const ids = new Set(GLOBAL_VC_ORGS.map((o) => o.id));
    for (const id of GLOBAL_VC_LOGO_IDS) expect(ids.has(id)).toBe(true);
  });
});
