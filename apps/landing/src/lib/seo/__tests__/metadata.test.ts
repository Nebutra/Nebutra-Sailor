import { brand } from "@nebutra/brand/metadata";
import { CONTENT_PRIMARY_ROUTE_LOCALES, toHreflang } from "@nebutra/i18n/locales";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { buildPageMetadata, DEFAULT_SITE_URL } from "../metadata";
import { type PublicationSet, unpublishedSet } from "../site-routes";

const EXPECTED_SITE_URL = `https://${brand.domains.landing}`;

describe("buildPageMetadata", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = EXPECTED_SITE_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV;
  });

  it("uses DEFAULT_SITE_URL fallback when env var missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const meta = buildPageMetadata({
      title: "T",
      description: "D",
      path: "/",
      locale: "en",
    });
    expect(meta.alternates?.canonical).toBe(DEFAULT_SITE_URL);
  });

  it("builds canonical URL using path and locale (default locale, no prefix)", () => {
    const meta = buildPageMetadata({
      title: "Pricing",
      description: "Plans",
      path: "/pricing",
      locale: "en",
    });
    expect(meta.title).toBe("Pricing");
    expect(meta.description).toBe("Plans");
    expect(meta.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/pricing`);
  });

  it("includes locale prefix in canonical for non-default locale", () => {
    const meta = buildPageMetadata({
      title: "定价",
      description: "套餐",
      path: "/pricing",
      locale: "zh-Hans",
    });
    expect(meta.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/zh-Hans/pricing`);
  });

  it("folds a legacy locale tag onto its route locale in the canonical", () => {
    // Bare `zh` is an alias that 308s in src/proxy.ts; it must never surface
    // as a canonical URL.
    const meta = buildPageMetadata({
      title: "定价",
      description: "套餐",
      path: "/pricing",
      locale: "zh",
    });
    expect(meta.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/zh-Hans/pricing`);
  });

  it("generates hreflang alternates for every supported locale", () => {
    const meta = buildPageMetadata({
      title: "Home",
      description: "Welcome",
      path: "/",
      locale: "en",
    });
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages).toBeDefined();
    expect(languages["en-US"]).toBe(EXPECTED_SITE_URL);
    expect(languages["zh-Hans-CN"]).toBe(`${EXPECTED_SITE_URL}/zh-Hans`);
    expect(languages["zh-Hant-TW"]).toBe(`${EXPECTED_SITE_URL}/zh-Hant`);
    expect(languages["x-default"]).toBe(EXPECTED_SITE_URL);
    expect(languages).not.toHaveProperty("zh");
    expect(Object.values(languages).filter((url) => /\/zh(\/|$)/.test(url))).toEqual([]);
  });

  it("populates openGraph and twitter metadata", () => {
    const meta = buildPageMetadata({
      title: "Pricing",
      description: "Plans",
      path: "/pricing",
      locale: "en",
      image: `${EXPECTED_SITE_URL}/custom.png`,
    });
    expect(meta.openGraph?.title).toBe("Pricing");
    expect(meta.openGraph?.description).toBe("Plans");
    expect(meta.openGraph?.url).toBe(`${EXPECTED_SITE_URL}/pricing`);
    const ogImages = meta.openGraph?.images as Array<{ url: string }>;
    expect(ogImages?.[0]?.url).toBe(`${EXPECTED_SITE_URL}/custom.png`);
    const twitter = meta.twitter as { card?: string };
    expect(twitter?.card).toBe("summary_large_image");
  });

  it("defaults image to dynamic /api/og endpoint when none provided", () => {
    const meta = buildPageMetadata({
      title: "Pricing",
      description: "Plans",
      path: "/pricing",
      locale: "en",
    });
    const ogImages = meta.openGraph?.images as Array<{ url: string }>;
    expect(ogImages?.[0]?.url).toContain("/api/og");
    expect(ogImages?.[0]?.url).toContain("title=");
  });
});

/**
 * The publication contract. Every assertion here fails if the scope-aware
 * decision is widened back to "every route locale", or if cluster membership,
 * canonical target and robots are allowed to be computed independently again.
 */
describe("buildPageMetadata publication contract", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = EXPECTED_SITE_URL;
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV;
  });

  function languagesOf(meta: ReturnType<typeof buildPageMetadata>) {
    return meta.alternates?.languages as Record<string, string> | undefined;
  }

  it("keeps a content-scoped cluster at exactly the content-primary locales", () => {
    const meta = buildPageMetadata({
      title: "Queue",
      description: "D",
      path: "/features/queue",
      locale: "en",
    });

    // Cardinality is the lock: a cluster of 35 means the scope decision was lost.
    expect(Object.keys(languagesOf(meta) ?? {}).sort()).toEqual(
      [...CONTENT_PRIMARY_ROUTE_LOCALES.map(toHreflang), "x-default"].sort(),
    );
    expect(CONTENT_PRIMARY_ROUTE_LOCALES.length).toBeLessThan(routing.locales.length);
    expect(meta.robots).toBeUndefined();
  });

  it("keeps a ui-scoped cluster at every route locale", () => {
    const meta = buildPageMetadata({
      title: "Pricing",
      description: "D",
      path: "/pricing",
      locale: "en",
    });

    expect(Object.keys(languagesOf(meta) ?? {})).toHaveLength(routing.locales.length + 1);
  });

  it("emits no cluster at all from a surrogate locale", () => {
    expect(CONTENT_PRIMARY_ROUTE_LOCALES).not.toContain("de");

    const meta = buildPageMetadata({
      title: "Queue",
      description: "D",
      path: "/features/queue",
      locale: "de",
    });

    // A cluster that omits the page advertising it is non-reciprocal, and
    // Google discards a non-reciprocal cluster for EVERY member — so one
    // surrogate emitting a cluster unpairs the two real documents.
    expect(languagesOf(meta)).toBeUndefined();
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/features/queue`);
    // og:url and og:locale must name the same document.
    expect(meta.openGraph?.url).toBe(`${EXPECTED_SITE_URL}/features/queue`);
    expect((meta.openGraph as { locale?: string }).locale).toBe("en_US");
  });

  it("marks a `none`-scoped route noindex and self-canonical, with no cluster", () => {
    const meta = buildPageMetadata({
      title: "Tagged",
      description: "D",
      path: "/blog/tag/ai",
      locale: "de",
    });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(languagesOf(meta)).toBeUndefined();
    // Self-canonical: nothing else should absorb its signal.
    expect(meta.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/de/blog/tag/ai`);
  });

  it("honours an explicit publication set with per-locale paths", () => {
    const set: PublicationSet = {
      path: "/blog/deep-dive",
      locales: ["en", "zh-Hans"],
      pathByLocale: { en: "/blog/deep-dive", "zh-Hans": "/blog/shen-du-zhi-nan" },
    };

    const zh = buildPageMetadata({
      title: "深度指南",
      description: "D",
      path: "/blog/shen-du-zhi-nan",
      locale: "zh-Hans",
      publishedIn: set,
    });

    expect(zh.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/zh-Hans/blog/shen-du-zhi-nan`);
    expect(languagesOf(zh)).toEqual({
      "en-US": `${EXPECTED_SITE_URL}/blog/deep-dive`,
      "zh-Hans-CN": `${EXPECTED_SITE_URL}/zh-Hans/blog/shen-du-zhi-nan`,
      "x-default": `${EXPECTED_SITE_URL}/blog/deep-dive`,
    });
  });

  it("omits x-default when the default locale is not a member", () => {
    const meta = buildPageMetadata({
      title: "只有中文",
      description: "D",
      path: "/blog/zhi-you-zhongwen",
      locale: "zh-Hans",
      publishedIn: {
        path: "/blog/zhi-you-zhongwen",
        locales: ["zh-Hans"],
      },
    });

    // An x-default at the English origin URL of a Chinese-only post is a 404.
    expect(languagesOf(meta)).toEqual({
      "zh-Hans-CN": `${EXPECTED_SITE_URL}/zh-Hans/blog/zhi-you-zhongwen`,
    });
  });

  it("noindexes an unpublished set and stays self-canonical", () => {
    const meta = buildPageMetadata({
      title: "@nebutra/queue",
      description: "D",
      path: "/features/queue",
      locale: "en",
      publishedIn: unpublishedSet("/features/queue"),
    });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(languagesOf(meta)).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(`${EXPECTED_SITE_URL}/features/queue`);
  });
});
