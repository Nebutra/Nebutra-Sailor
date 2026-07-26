import type { MetadataRoute } from "next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { routing } from "@/i18n/routing";

// getArticles() reads the fumadocs MDX build output (.source/server), a build
// artifact; projects is a large static catalogue. Both are replaced with the
// smallest fixtures that exercise the scoping rules.
vi.mock("@/lib/articles", () => ({
  getArticles: () => [
    { slug: "hello-world", title: "Hello", date: "2026-01-01", excerpt: "", tags: [] },
  ],
}));
vi.mock("@/lib/projects", () => ({
  projects: [{ slug: "nebutra-sailor" }],
}));

const BASE = "https://tsekaluk.dev";

let entries: MetadataRoute.Sitemap;

beforeAll(async () => {
  const { default: sitemap } = await import("../sitemap");
  entries = sitemap();
});

describe("tsekaluk.dev sitemap", () => {
  it("never emits a bare `zh` locale segment, in a URL or in an alternate", () => {
    // routing.locales is ROUTE_LOCALES (zh-Hans / zh-Hant), so `/zh/...` is a
    // path the router cannot resolve. It used to appear in the homepage's
    // hand-written hreflang cluster and in json-ld's inLanguage.
    const bareZh = /\/zh(\/|$)/;
    for (const entry of entries) {
      expect(entry.url, entry.url).not.toMatch(bareZh);
      for (const href of Object.values(entry.alternates?.languages ?? {})) {
        expect(String(href), String(href)).not.toMatch(bareZh);
      }
    }
  });

  it("publishes a `content` essay exactly once, with a single-member cluster", () => {
    const essays = entries.filter((e) => e.url.includes("/thinking/hello-world"));
    expect(essays.map((e) => e.url)).toEqual([`${BASE}/en/thinking/hello-world`]);

    const languages = essays[0]?.alternates?.languages ?? {};
    // One member + one x-default, both pointing at the only URL that exists.
    expect(Object.keys(languages).sort()).toEqual(["en-US", "x-default"]);
    expect(languages["en-US"]).toBe(`${BASE}/en/thinking/hello-world`);
    expect(languages["x-default"]).toBe(`${BASE}/en/thinking/hello-world`);
  });

  it("publishes a `ui` route in every route locale with a full reciprocal cluster", () => {
    const work = entries.filter((e) => e.url.endsWith("/work"));
    expect(work).toHaveLength(routing.locales.length);

    const languages = work[0]?.alternates?.languages ?? {};
    expect(Object.keys(languages)).toHaveLength(routing.locales.length + 1);
    expect(languages).toHaveProperty("x-default", `${BASE}/en/work`);
  });

  it("publishes project detail pages as `ui` (catalog-translated)", () => {
    const project = entries.filter((e) => e.url.endsWith("/work/nebutra-sailor"));
    expect(project).toHaveLength(routing.locales.length);
  });

  it("never publishes an unprefixed URL — the unprefixed form is a redirect", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith(`${BASE}/`), entry.url).toBe(true);
      const [locale] = entry.url.slice(BASE.length + 1).split("/");
      expect(routing.locales, entry.url).toContain(locale);
    }
  });
});

describe("json-ld", () => {
  it("derives inLanguage from the publication set and contains no bare `zh`", async () => {
    const { websiteJsonLd } = await import("@/lib/json-ld");
    const tags = websiteJsonLd().inLanguage;
    expect(tags).not.toContain("zh");
    expect(tags).toHaveLength(routing.locales.length);
    expect(tags).toContain("en-US");
  });
});
