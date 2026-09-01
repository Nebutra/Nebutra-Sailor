import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brand, colors } from "../metadata";

// RED: metadata-helpers module does not exist yet
// This will fail with "Cannot find module '../metadata-helpers'"
import {
  buildFeedChannelMeta,
  buildOrganizationJsonLd,
  buildPwaManifest,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  getBrandCookieDomain,
  getBrandEmail,
  getBrandMailFrom,
  getBrandOrigin,
  getBrandPublicUrls,
  getMarketingHomePath,
  getMarketingHomeUrl,
  getSiteMetadata,
  getSiteUrl,
  MARKETING_HOME_PARAM,
  publicAssetUrl,
} from "../metadata-helpers";

describe("getSiteUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to brand.domains.landing when env var not set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const url = getSiteUrl("landing");
    expect(url).toBe(`https://${brand.domains.landing}`);
  });

  it("strips trailing slash from env override", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://custom.com/");
    const url = getSiteUrl("landing");
    expect(url).toBe("https://custom.com");
  });

  it("returns env override when set without trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://custom.com");
    const url = getSiteUrl("landing");
    expect(url).toBe("https://custom.com");
  });

  it("defaults service to landing when not specified", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const url = getSiteUrl();
    expect(url).toBe(`https://${brand.domains.landing}`);
  });

  it("uses brand.domains[service] for other services when no env var", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const url = getSiteUrl("app");
    expect(url).toBe(`https://${brand.domains.app}`);
  });
});

describe("getSiteMetadata", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses brand.name as applicationName", () => {
    const meta = getSiteMetadata({ service: "landing" });
    expect(meta.applicationName).toBe(brand.name);
  });

  it("uses brand.tagline as default description when none provided", () => {
    const meta = getSiteMetadata({ service: "landing" });
    expect(meta.description).toBe(brand.tagline);
  });

  it("uses provided description", () => {
    const meta = getSiteMetadata({ service: "landing", description: "Custom desc" });
    expect(meta.description).toBe("Custom desc");
  });

  it("uses brand.name in default title", () => {
    const meta = getSiteMetadata({ service: "landing" });
    expect(JSON.stringify(meta.title)).toContain(brand.name);
  });
});

describe("buildOrganizationJsonLd", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("@id is derived from getSiteUrl", () => {
    const jsonLd = buildOrganizationJsonLd();
    expect(jsonLd["@id"]).toContain(brand.domains.landing);
  });

  it("name matches brand.name", () => {
    const jsonLd = buildOrganizationJsonLd();
    expect(jsonLd.name).toBe(brand.name);
  });

  it("sameAs filters empty social urls", () => {
    const jsonLd = buildOrganizationJsonLd();
    expect(jsonLd.sameAs).toBeDefined();
    for (const url of jsonLd.sameAs) {
      expect(url.trim()).not.toBe("");
    }
  });

  it("url is derived from getSiteUrl", () => {
    const jsonLd = buildOrganizationJsonLd();
    expect(jsonLd.url).toContain(brand.domains.landing);
  });
});

describe("buildWebSiteJsonLd", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("@type is WebSite", () => {
    const jsonLd = buildWebSiteJsonLd();
    expect(jsonLd["@type"]).toBe("WebSite");
  });

  it("publisher references organization @id", () => {
    const org = buildOrganizationJsonLd();
    const site = buildWebSiteJsonLd();
    expect(site.publisher["@id"]).toBe(org["@id"]);
  });
});

describe("buildPwaManifest", () => {
  it("background_color matches colors.neutral[950]", () => {
    const manifest = buildPwaManifest();
    expect(manifest.background_color).toBe(colors.neutral["950"]);
  });

  it("theme_color matches colors.primary[500]", () => {
    const manifest = buildPwaManifest();
    expect(manifest.theme_color).toBe(colors.primary["500"]);
  });

  it("short_name matches brand.name", () => {
    const manifest = buildPwaManifest();
    expect(manifest.short_name).toBe(brand.name);
  });

  it("declares square PNG app icons that match checked-in asset dimensions", async () => {
    const manifest = buildPwaManifest();
    const pngIcons = manifest.icons?.filter((icon) => icon.type === "image/png") ?? [];
    const uniquePngIcons = new Map(pngIcons.map((icon) => [icon.src, icon]));

    for (const icon of uniquePngIcons.values()) {
      const expectedSize = Number(icon.sizes?.split("x").at(0));
      const assetPath = fileURLToPath(new URL(`../../assets/favicon${icon.src}`, import.meta.url));
      const metadata = await sharp(assetPath).metadata();

      expect(metadata.width).toBe(expectedSize);
      expect(metadata.height).toBe(expectedSize);
    }
  });
});

describe("buildFeedChannelMeta", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("title is brand.name + Changelog", () => {
    const meta = buildFeedChannelMeta();
    expect(meta.title).toBe(`${brand.name} Changelog`);
  });

  it("all URLs derive from getSiteUrl(landing)", () => {
    const meta = buildFeedChannelMeta();
    const siteUrl = getSiteUrl("landing");
    expect(meta.link).toContain(siteUrl);
    expect(meta.feedUrl).toContain(siteUrl);
  });
});

describe("buildSoftwareApplicationJsonLd", () => {
  it("@type is SoftwareApplication", () => {
    const jsonLd = buildSoftwareApplicationJsonLd();
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
  });

  it("name contains brand.name", () => {
    const jsonLd = buildSoftwareApplicationJsonLd();
    expect(jsonLd.name).toContain(brand.name);
  });
});

describe("getBrandOrigin / getBrandPublicUrls", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not let NEXT_PUBLIC_SITE_URL hijack non-landing services", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://custom.com");
    expect(getSiteUrl("app")).toBe(`https://${brand.domains.app}`);
    expect(getBrandOrigin("router")).toBe(`https://${brand.domains.router}`);
  });

  it("maps public URLs and cookie domain from brand.domains", () => {
    const u = getBrandPublicUrls();
    expect(u.authUrl).toBe(`https://${brand.domains.auth}`);
    expect(u.routerUrl).toBe(`https://${brand.domains.router}`);
    expect(u.cdnUrl).toBe(`https://${brand.domains.cdn}`);
    expect(u.cookieDomain).toBe(`.${brand.domains.landing}`);
    expect(getBrandCookieDomain()).toBe(`.${brand.domains.landing}`);
  });
});

describe("publicAssetUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("R2_PUBLIC_URL", "");
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "");
  });

  it("resolves content keys on the brand CDN", () => {
    expect(publicAssetUrl("landing/images/about/hero-premium.png")).toBe(
      `https://${brand.domains.cdn}/landing/images/about/hero-premium.png`,
    );
    expect(publicAssetUrl("/brand/logo/logo-color.svg")).toBe(
      `https://${brand.domains.cdn}/brand/logo/logo-color.svg`,
    );
  });

  it("rejects traversal", () => {
    expect(() => publicAssetUrl("../secret")).toThrow("invalid_public_asset_key");
  });
});

describe("getBrandEmail / getBrandMailFrom", () => {
  it("derives mailboxes from landing apex", () => {
    expect(getBrandEmail("contact")).toBe(`contact@${brand.domains.landing}`);
    expect(getBrandMailFrom()).toBe(`${brand.name} <noreply@${brand.domains.landing}>`);
  });
});

describe("getMarketingHomePath", () => {
  it("is a same-origin path with a bare home flag", () => {
    expect(getMarketingHomePath()).toBe(`/?${MARKETING_HOME_PARAM}`);
    expect(getMarketingHomePath({ locale: "zh-Hans" })).toBe(`/zh-Hans?${MARKETING_HOME_PARAM}`);
  });
});

describe("getMarketingHomeUrl", () => {
  it("uses the landing origin and ?home for the default locale", () => {
    expect(getMarketingHomeUrl()).toBe(`https://${brand.domains.landing}/?${MARKETING_HOME_PARAM}`);
    expect(getMarketingHomeUrl({ locale: "en" })).toBe(
      `https://${brand.domains.landing}/?${MARKETING_HOME_PARAM}`,
    );
  });

  it("prefixes a non-default locale and keeps the bare home flag", () => {
    const url = new URL(getMarketingHomeUrl({ locale: "zh-Hans" }));
    expect(url.origin).toBe(`https://${brand.domains.landing}`);
    expect(url.pathname).toBe("/zh-Hans");
    expect(url.search).toBe(`?${MARKETING_HOME_PARAM}`);
    expect(url.searchParams.has(MARKETING_HOME_PARAM)).toBe(true);
  });
});
