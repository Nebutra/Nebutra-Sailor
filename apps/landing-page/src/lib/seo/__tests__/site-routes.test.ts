import { describe, expect, it } from "vitest";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  getSitelinkCandidateRoutes,
  HREFLANG_BY_LOCALE,
  PUBLIC_SEO_ROUTES,
} from "../site-routes";

describe("site SEO route registry", () => {
  it("keeps hreflang keys aligned with localized canonical URLs", () => {
    const languages = buildHreflangAlternates("https://nebutra.com/", "/pricing");

    expect(languages).toMatchObject({
      en: "https://nebutra.com/pricing",
      "zh-Hans": "https://nebutra.com/zh/pricing",
      ja: "https://nebutra.com/ja/pricing",
      ko: "https://nebutra.com/ko/pricing",
      es: "https://nebutra.com/es/pricing",
      fr: "https://nebutra.com/fr/pricing",
      de: "https://nebutra.com/de/pricing",
      "x-default": "https://nebutra.com/pricing",
    });
  });

  it("normalizes homepage canonical URLs without trailing-slash drift", () => {
    expect(canonicalUrlForLocale("https://nebutra.com/", "en", "/")).toBe("https://nebutra.com");
    expect(canonicalUrlForLocale("https://nebutra.com/", "zh", "/")).toBe("https://nebutra.com/zh");
  });

  it("marks durable sitelink candidates inside the public route registry", () => {
    const candidates = getSitelinkCandidateRoutes().map((route) => route.path);

    expect(candidates).toEqual(
      expect.arrayContaining([
        "/features",
        "/pricing",
        "/licensing",
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
    expect(HREFLANG_BY_LOCALE.zh).toBe("zh-Hans");
    expect(PUBLIC_SEO_ROUTES.every((route) => route.path.startsWith("/"))).toBe(true);
  });
});
