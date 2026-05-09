import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPageMetadata, DEFAULT_SITE_URL } from "../metadata";

describe("buildPageMetadata", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nebutra.com";
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
    expect(meta.alternates?.canonical).toBe(`${DEFAULT_SITE_URL}/`);
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
    expect(meta.alternates?.canonical).toBe("https://nebutra.com/pricing");
  });

  it("includes locale prefix in canonical for non-default locale", () => {
    const meta = buildPageMetadata({
      title: "定价",
      description: "套餐",
      path: "/pricing",
      locale: "zh",
    });
    expect(meta.alternates?.canonical).toBe("https://nebutra.com/zh/pricing");
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
    expect(languages.en).toBe("https://nebutra.com/");
    expect(languages["zh-Hans"]).toBe("https://nebutra.com/zh/");
    expect(languages["x-default"]).toBe("https://nebutra.com/");
  });

  it("populates openGraph and twitter metadata", () => {
    const meta = buildPageMetadata({
      title: "Pricing",
      description: "Plans",
      path: "/pricing",
      locale: "en",
      image: "https://nebutra.com/custom.png",
    });
    expect(meta.openGraph?.title).toBe("Pricing");
    expect(meta.openGraph?.description).toBe("Plans");
    expect(meta.openGraph?.url).toBe("https://nebutra.com/pricing");
    const ogImages = meta.openGraph?.images as Array<{ url: string }>;
    expect(ogImages?.[0]?.url).toBe("https://nebutra.com/custom.png");
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
