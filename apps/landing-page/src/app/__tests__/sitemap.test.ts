import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blog", () => ({
  getAllPosts: vi.fn(async () => []),
}));

import sitemap from "../sitemap";

describe("sitemap", () => {
  it("uses the shared BCP-47 hreflang map for localized alternates", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nebutra.com/";

    const entries = await sitemap();
    const pricing = entries.find((entry) => entry.url === "https://nebutra.com/pricing");

    expect(pricing?.alternates?.languages).toMatchObject({
      en: "https://nebutra.com/pricing",
      "zh-Hans": "https://nebutra.com/zh/pricing",
      "x-default": "https://nebutra.com/pricing",
    });
    expect(pricing?.alternates?.languages).not.toHaveProperty("zh");
  });

  it("keeps homepage URLs normalized consistently in loc and alternates", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nebutra.com/";

    const entries = await sitemap();
    const home = entries.find((entry) => entry.url === "https://nebutra.com");

    expect(home).toBeDefined();
    expect(home?.alternates?.languages).toMatchObject({
      en: "https://nebutra.com",
      "zh-Hans": "https://nebutra.com/zh",
      "x-default": "https://nebutra.com",
    });
  });
});
