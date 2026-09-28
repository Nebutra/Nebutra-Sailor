import { describe, expect, it } from "vitest";
import { buildBrandConfig, DEFAULT_BRAND, rebaseDomains } from "../../scripts/brand-types";

/**
 * `pnpm brand:init` → `pnpm brand:apply` is the first thing a new project does
 * (the welcome page says so). Two ways it used to go wrong:
 *   - it wrote twelve domain keys of its own, one retired, while the brand
 *     package reads every key of DEFAULT_BRAND.domains, so the rebranded
 *     @nebutra/brand failed to build;
 *   - it cloned DEFAULT_BRAND — Nebutra's own instance — and overwrote a few
 *     fields, so the new project's legal pages named Nebutra's company.
 */
const acme = buildBrandConfig({
  name: "Acme",
  tagline: "Ship faster",
  description: "An example product",
  companyName: "Acme Inc.",
  email: "hello@acme.com",
  year: 2026,
  baseDomain: "acme.com",
  repoOwner: "acme",
  repoName: "acme-platform",
  social: {
    twitter: "",
    github: "https://github.com/acme/acme-platform",
    discord: "",
    linkedin: "",
  },
  packageScope: "@acme",
});

describe("brand:init domains", () => {
  const moved = rebaseDomains(DEFAULT_BRAND.domains, "acme.com");

  it("covers exactly the keys the brand package reads", () => {
    expect(Object.keys(moved).sort()).toEqual(Object.keys(DEFAULT_BRAND.domains).sort());
  });

  it("moves every host onto the new base domain", () => {
    expect(moved.landing).toBe("acme.com");
    expect(moved.app).toBe("app.acme.com");
    for (const host of Object.values(moved)) expect(host).toMatch(/(^|\.)acme\.com$/);
  });
});

describe("brand:init identity", () => {
  it("carries none of Nebutra's names, entity, story, hosts or links", () => {
    const { logoAssets, fontAssets, faviconAssets, colors, typography, ...identity } = acme;
    const text = JSON.stringify(identity);
    expect(text).not.toMatch(/nebutra|云毓|无锡/i);
  });

  it("names the new company as the legal entity", () => {
    expect(acme.brand.nameFullEn).toBe("Acme Inc.");
    expect(acme.brand.nameFull).toBe("Acme Inc.");
    expect(acme.brand.story).toBeUndefined();
    expect(acme.license.commercialExempt).toEqual(["Acme Inc."]);
  });
});
