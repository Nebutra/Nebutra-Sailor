import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { describe, expect, it } from "vitest";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  getPublicNavigationItems,
  getSitelinkCandidateRoutes,
  HREFLANG_BY_LOCALE,
  PUBLIC_SEO_ROUTES,
} from "../site-routes";

describe("site SEO route registry", () => {
  it("keeps hreflang keys aligned with localized canonical URLs", () => {
    const languages = buildHreflangAlternates("https://nebutra.com/", "/pricing");

    expect(languages).toMatchObject({
      "en-US": "https://nebutra.com/pricing",
      // Chinese is script-split: the route prefix is zh-Hans / zh-Hant, never
      // a bare /zh (that prefix only exists as a 308 in src/proxy.ts).
      "zh-Hans-CN": "https://nebutra.com/zh-Hans/pricing",
      "zh-Hant-TW": "https://nebutra.com/zh-Hant/pricing",
      "ja-JP": "https://nebutra.com/ja/pricing",
      "ko-KR": "https://nebutra.com/ko/pricing",
      "es-ES": "https://nebutra.com/es/pricing",
      "fr-FR": "https://nebutra.com/fr/pricing",
      "de-DE": "https://nebutra.com/de/pricing",
      "x-default": "https://nebutra.com/pricing",
    });
  });

  it("normalizes homepage canonical URLs without trailing-slash drift", () => {
    expect(canonicalUrlForLocale("https://nebutra.com/", "en", "/")).toBe("https://nebutra.com");
    expect(canonicalUrlForLocale("https://nebutra.com/", "zh-Hans", "/")).toBe(
      "https://nebutra.com/zh-Hans",
    );
  });

  it("folds a legacy locale tag onto its route locale instead of emitting it", () => {
    // Bare `zh` is a legacy alias, not a route locale — a canonical URL must
    // never be built from it verbatim.
    expect(canonicalUrlForLocale("https://nebutra.com/", "zh", "/")).toBe(
      "https://nebutra.com/zh-Hans",
    );
    expect(canonicalUrlForLocale("https://nebutra.com/", "zh-TW", "/pricing")).toBe(
      "https://nebutra.com/zh-Hant/pricing",
    );
    expect(canonicalUrlForLocale("https://nebutra.com/", "en-US", "/pricing")).toBe(
      "https://nebutra.com/pricing",
    );
  });

  it("marks durable sitelink candidates inside the public route registry", () => {
    const candidates = getSitelinkCandidateRoutes().map((route) => route.path);

    expect(candidates).toEqual(
      expect.arrayContaining([
        "/features",
        "/refer",
        "/solutions",
        "/pricing",
        "/get-license",
        "/licensing",
        "/ai/models",
        "/blog",
        "/changelog",
        "/roadmap",
        "/status",
        "/security",
        "/about",
        "/contact",
      ]),
    );
  });

  it("does not expose sitemap alternates with raw locale keys when BCP-47 differs", () => {
    expect(HREFLANG_BY_LOCALE.en).toBe("en-US");
    expect(HREFLANG_BY_LOCALE["zh-Hans"]).toBe("zh-Hans-CN");
    expect(HREFLANG_BY_LOCALE.de).toBe("de-DE");
    expect(PUBLIC_SEO_ROUTES.every((route) => route.path.startsWith("/"))).toBe(true);
  });

  it("includes a follow link to the public Forge origin in JSON-LD navigation", () => {
    expect(getPublicNavigationItems()).toEqual(
      expect.arrayContaining([{ name: "Forge", url: getBrandOrigin("forge") }]),
    );
  });
});
