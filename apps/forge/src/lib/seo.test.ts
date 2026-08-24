import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildForgePageMetadata,
  buildForgeToolJsonLd,
  buildForgeWebSiteJsonLd,
  forgeAbsoluteUrl,
  getForgeOrigin,
  getForgeVerification,
  getIndexNowKey,
  stripForgeTitleSuffix,
} from "./seo";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env.NEXT_PUBLIC_FORGE_URL = originalEnv.NEXT_PUBLIC_FORGE_URL;
  process.env.GOOGLE_SITE_VERIFICATION = originalEnv.GOOGLE_SITE_VERIFICATION;
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION =
    originalEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  process.env.BING_SITE_VERIFICATION = originalEnv.BING_SITE_VERIFICATION;
  process.env.INDEXNOW_KEY = originalEnv.INDEXNOW_KEY;
});

describe("getForgeOrigin", () => {
  it("falls back to the brand origin", () => {
    delete process.env.NEXT_PUBLIC_FORGE_URL;
    expect(getForgeOrigin()).toBe(getBrandOrigin("forge"));
  });

  it("normalizes an env host without a trailing slash", () => {
    process.env.NEXT_PUBLIC_FORGE_URL = "https://forge.example.test/";
    expect(getForgeOrigin()).toBe("https://forge.example.test");
    expect(forgeAbsoluteUrl("/t/base64")).toBe("https://forge.example.test/t/base64");
  });
});

describe("stripForgeTitleSuffix", () => {
  it("removes a baked-in brand suffix from older page models", () => {
    expect(stripForgeTitleSuffix("Base64 Encode/Decode Online | Nebutra Forge")).toBe(
      "Base64 Encode/Decode Online",
    );
    expect(stripForgeTitleSuffix("Base64 Encode/Decode Online")).toBe(
      "Base64 Encode/Decode Online",
    );
  });
});

describe("buildForgePageMetadata", () => {
  it("emits canonical, index robots, and social cards", () => {
    const meta = buildForgePageMetadata({
      title: "Base64 Encode/Decode Online | Nebutra Forge",
      description: "Convert UTF-8 text to/from Base64",
      path: "/t/base64",
      keywords: ["base64 encode decode online"],
    });

    expect(meta.alternates).toEqual({ canonical: "/t/base64" });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.openGraph).toMatchObject({
      url: "/t/base64",
      title: "Base64 Encode/Decode Online",
    });
    expect(meta.title).toBe("Base64 Encode/Decode Online");
  });

  it("keeps the home title absolute so the layout template does not stack", () => {
    const meta = buildForgePageMetadata({
      title: "Nebutra Forge — Online tool station",
      description: "Codecs, text, hashing, documents, and image tools online.",
      path: "/",
      absoluteTitle: true,
    });
    expect(meta.title).toEqual({ absolute: "Nebutra Forge — Online tool station" });
    expect(meta.alternates).toEqual({ canonical: "/" });
  });

  it("marks private chrome noindex", () => {
    const meta = buildForgePageMetadata({
      title: "Wallet",
      description: "Prepaid wallet",
      path: "/wallet",
      index: false,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe("verification + IndexNow", () => {
  it("omits verification when env is empty", () => {
    delete process.env.GOOGLE_SITE_VERIFICATION;
    delete process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
    delete process.env.BING_SITE_VERIFICATION;
    expect(getForgeVerification()).toBeUndefined();
  });

  it("wires Google and Bing codes when present", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "g-code";
    process.env.BING_SITE_VERIFICATION = "b-code";
    expect(getForgeVerification()).toEqual({
      google: "g-code",
      other: { "msvalidate.01": "b-code" },
    });
  });

  it("rejects a short IndexNow key", () => {
    process.env.INDEXNOW_KEY = "short";
    expect(getIndexNowKey()).toBeUndefined();
    process.env.INDEXNOW_KEY = "indexnow-key-value";
    expect(getIndexNowKey()).toBe("indexnow-key-value");
  });
});

describe("JSON-LD", () => {
  it("describes the station and a tool page without leaking a second host", () => {
    delete process.env.NEXT_PUBLIC_FORGE_URL;
    const site = buildForgeWebSiteJsonLd("Online tool station");
    expect(site[0]["@type"]).toBe("WebSite");
    expect(site[0].url).toBe(`${getBrandOrigin("forge")}/`);

    const tool = buildForgeToolJsonLd({
      name: "Base64 Encode/Decode",
      description: "Convert UTF-8 text to/from Base64",
      path: "/t/base64",
      category: "codec",
    });
    expect(tool[0]["@type"]).toBe("BreadcrumbList");
    expect(tool[1].url).toBe(`${getBrandOrigin("forge")}/t/base64`);
  });
});
