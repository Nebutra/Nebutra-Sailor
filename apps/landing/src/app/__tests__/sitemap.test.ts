import { CONTENT_PRIMARY_ROUTE_LOCALES, toHreflang } from "@nebutra/i18n/locales";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { routing } from "@/i18n/routing";

/**
 * Language-dependent blog fixture. The two members of one translation cluster
 * deliberately have DIFFERENT slugs — that is the only shape that can catch a
 * sitemap which reuses the shard's own slug for every cluster member.
 */
const EN_POST = {
  slug: "deep-dive",
  language: "en",
  translationKey: "T1",
  date: "2026-01-05T00:00:00.000Z",
  updatedAt: "2026-01-09T00:00:00.000Z",
};
const ZH_POST = {
  slug: "shen-du-zhi-nan",
  language: "zh",
  translationKey: "T1",
  date: "2026-01-05T00:00:00.000Z",
  updatedAt: "2026-01-09T00:00:00.000Z",
};
/** No sibling, and no honest timestamp: `@/lib/blog` synthesizes the epoch. */
const ZH_ONLY_POST = {
  slug: "zhi-you-zhongwen",
  language: "zh",
  translationKey: "T2",
  date: new Date(0).toISOString(),
  updatedAt: undefined,
};

vi.mock("@/lib/blog", () => ({
  getAllPosts: vi.fn(async (language: string) =>
    language === "zh" ? [ZH_POST, ZH_ONLY_POST] : [EN_POST],
  ),
}));

import robots from "../robots";
import sitemap, { generateSitemaps } from "../sitemap";
import { GET as sitemapIndex } from "../sitemap.xml/route";

const BASE_URL = "https://nebutra.com";

/** Captured before any sitemap runs, so a build-time `new Date()` is detectable. */
const TEST_START = Date.now();

type Entry = Awaited<ReturnType<typeof sitemap>>[number];

let shards: Map<string, Entry[]>;

async function shard(locale: string): Promise<Entry[]> {
  const cached = shards.get(locale);
  if (cached) return cached;
  const entries = await sitemap({ id: locale });
  shards.set(locale, entries);
  return entries;
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SITE_URL = `${BASE_URL}/`;
  // The changelog family reads the CMS; keep the guard hermetic and offline.
  process.env.E2E_SKIP_CMS = "1";
  shards = new Map();
  await Promise.all(routing.locales.map((locale) => shard(locale)));
});

describe("sitemap sharding", () => {
  it("emits exactly one shard per route locale", () => {
    const ids = generateSitemaps().map((child) => child.id);

    expect(ids).toEqual([...routing.locales]);
    expect(ids).not.toContain("zh");
  });

  it("returns an empty shard for a non-route locale id", async () => {
    expect(await sitemap({ id: "zh" })).toEqual([]);
    expect(await sitemap({ id: "not-a-locale" })).toEqual([]);
  });

  // Next 16 invokes the handler as `handler({ id: targetIdPromise })` — see
  // getDynamicSitemapRouteCode in next/dist/build/webpack/loaders/
  // next-metadata-route-loader.js. A handler that reads `id` as a bare string
  // returns [] for every shard in production while passing a string-arg test.
  it("resolves the shard id when Next passes it as a promise", async () => {
    const fromPromise = await sitemap({ id: Promise.resolve("en") });
    const fromString = await sitemap({ id: "en" });

    expect(fromPromise.length).toBeGreaterThan(0);
    expect(fromPromise).toEqual(fromString);
    expect(await sitemap({ id: Promise.resolve(undefined) })).toEqual([]);
  });
});

describe("sitemap index", () => {
  it("serves the /sitemap.xml URL robots.txt advertises", () => {
    // Next emits no <sitemapindex> for a sharded sitemap and moves the shards
    // to /sitemap/<id>.xml, so /sitemap.xml only exists because of the
    // hand-written route — this ties the two together.
    expect(robots().sitemap).toBe(`${BASE_URL}/sitemap.xml`);
  });

  it("links every shard exactly once as a sitemapindex", async () => {
    const response = sitemapIndex();
    expect(response.headers.get("Content-Type")).toContain("application/xml");

    const body = await response.text();
    expect(body).toContain("<sitemapindex");

    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(routing.locales.map((locale) => `${BASE_URL}/sitemap/${locale}.xml`));
    expect(locs).not.toContain(`${BASE_URL}/sitemap/zh.xml`);
  });
});

describe("sitemap hreflang clusters", () => {
  it("uses the shared BCP-47 hreflang map for localized alternates", async () => {
    const pricing = (await shard("en")).find((entry) => entry.url === `${BASE_URL}/pricing`);

    expect(pricing).toBeDefined();
    expect(pricing?.alternates?.languages).toMatchObject({
      [toHreflang("en")]: `${BASE_URL}/pricing`,
      [toHreflang("zh-Hans")]: `${BASE_URL}/zh-Hans/pricing`,
      [toHreflang("zh-Hant")]: `${BASE_URL}/zh-Hant/pricing`,
      "x-default": `${BASE_URL}/pricing`,
    });
    // Bare `zh` is not a route locale — this assertion is the regression lock.
    expect(pricing?.alternates?.languages).not.toHaveProperty("zh");
  });

  it("keeps homepage URLs normalized consistently in loc and alternates", async () => {
    const home = (await shard("en")).find((entry) => entry.url === BASE_URL);

    expect(home).toBeDefined();
    expect(home?.alternates?.languages).toMatchObject({
      [toHreflang("en")]: BASE_URL,
      [toHreflang("zh-Hans")]: `${BASE_URL}/zh-Hans`,
      "x-default": BASE_URL,
    });
  });
});

describe("sitemap URL inventory", () => {
  function allEntries(): Entry[] {
    return [...shards.values()].flat();
  }

  it("never publishes a legacy bare /zh URL", () => {
    const offenders = allEntries()
      .flatMap((entry) => [entry.url, ...Object.values(entry.alternates?.languages ?? {})])
      .filter((url) => typeof url === "string" && /\/zh(\/|$)/.test(url));

    expect(offenders).toEqual([]);
  });

  it("never publishes docs URLs — that inventory belongs to the docs origin", () => {
    const offenders = allEntries()
      .map((entry) => entry.url)
      .filter((url) => url.includes("/docs"));

    expect(offenders).toEqual([]);
  });

  it("publishes solutions index and detail pages in the content-primary shards", async () => {
    const en = (await shard("en")).map((entry) => entry.url);

    expect(en).toEqual(
      expect.arrayContaining([
        `${BASE_URL}/solutions`,
        `${BASE_URL}/solutions/go-global`,
        `${BASE_URL}/solutions/architecture`,
        `${BASE_URL}/solutions/ai-data-ops`,
        `${BASE_URL}/solutions/global-vc`,
      ]),
    );

    const zhHans = (await shard("zh-Hans")).map((entry) => entry.url);
    expect(zhHans).toEqual(
      expect.arrayContaining([
        `${BASE_URL}/zh-Hans/solutions`,
        `${BASE_URL}/zh-Hans/solutions/go-global`,
      ]),
    );
  });

  it("keeps ui routes in every shard but content routes out of non-primary shards", async () => {
    expect(CONTENT_PRIMARY_ROUTE_LOCALES).not.toContain("de");

    const de = (await shard("de")).map((entry) => entry.url);

    expect(de).toContain(`${BASE_URL}/de/solutions`);
    expect(de).not.toContain(`${BASE_URL}/de/solutions/go-global`);
    expect(de.filter((url) => /\/(blog|changelog|features|solutions)\/[^/]+$/.test(url))).toEqual(
      [],
    );
  });

  it("never stamps a build-time lastModified", () => {
    const stamped = allEntries()
      .filter((entry) => entry.lastModified !== undefined)
      .filter((entry) => new Date(entry.lastModified as string | Date).getTime() >= TEST_START);

    expect(stamped.map((entry) => entry.url)).toEqual([]);
  });
});

describe("sitemap blog translation clusters", () => {
  it("advertises each cluster member at its own slug, reciprocally", async () => {
    const en = (await shard("en")).find((entry) => entry.url === `${BASE_URL}/blog/deep-dive`);
    const zh = (await shard("zh-Hans")).find(
      (entry) => entry.url === `${BASE_URL}/zh-Hans/blog/shen-du-zhi-nan`,
    );

    expect(en).toBeDefined();
    expect(zh).toBeDefined();

    // Both shards must describe the SAME pair of URLs. Reusing the shard's own
    // slug for the sibling fabricates a 404 and makes the two clusters
    // disjoint, which voids the annotation for both real documents.
    const expected = {
      [toHreflang("en")]: `${BASE_URL}/blog/deep-dive`,
      [toHreflang("zh-Hans")]: `${BASE_URL}/zh-Hans/blog/shen-du-zhi-nan`,
      "x-default": `${BASE_URL}/blog/deep-dive`,
    };
    expect(en?.alternates?.languages).toEqual(expected);
    expect(zh?.alternates?.languages).toEqual(expected);
  });

  it("does not invent an English sibling for a post that exists only in Chinese", async () => {
    const zhOnly = (await shard("zh-Hans")).find((entry) =>
      entry.url.endsWith("/blog/zhi-you-zhongwen"),
    );

    expect(zhOnly).toBeDefined();
    // Single-member cluster: no en-US member, and no x-default either — the
    // default locale has no document here, so an x-default would 404.
    expect(zhOnly?.alternates?.languages).toEqual({
      [toHreflang("zh-Hans")]: `${BASE_URL}/zh-Hans/blog/zhi-you-zhongwen`,
    });

    const en = (await shard("en")).map((entry) => entry.url);
    expect(en).not.toContain(`${BASE_URL}/blog/zhi-you-zhongwen`);
  });

  it("never publishes the 1970 epoch sentinel as <lastmod>", async () => {
    const zhOnly = (await shard("zh-Hans")).find((entry) =>
      entry.url.endsWith("/blog/zhi-you-zhongwen"),
    );
    // The epoch is rejected as a content date, so the entry falls through to
    // the git-derived ROUTE_LASTMOD snapshot for `/blog/*` — never to 1970.
    expect(new Date(zhOnly?.lastModified as string | Date).getTime()).toBeGreaterThan(0);
    const epochOffenders = [...shards.values()]
      .flat()
      .filter((entry) => entry.lastModified !== undefined)
      .filter((entry) => new Date(entry.lastModified as string | Date).getTime() <= 0);
    expect(epochOffenders.map((entry) => entry.url)).toEqual([]);

    // A real timestamp still survives, so the guard above is not vacuous.
    const paired = (await shard("en")).find((entry) => entry.url.endsWith("/blog/deep-dive"));
    expect(new Date(paired?.lastModified as string | Date).toISOString()).toBe(
      "2026-01-09T00:00:00.000Z",
    );
  });
});

describe("sitemap publication scope", () => {
  it("keeps a content family at exactly the content-primary locales", async () => {
    const solutions = (await shard("en")).find(
      (entry) => entry.url === `${BASE_URL}/solutions/go-global`,
    );

    // Cardinality, not just membership: widening the loop back to every route
    // locale must fail here rather than pass silently.
    const languages = solutions?.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages).sort()).toEqual(
      [...CONTENT_PRIMARY_ROUTE_LOCALES.map(toHreflang), "x-default"].sort(),
    );
    expect(CONTENT_PRIMARY_ROUTE_LOCALES.length).toBeLessThan(routing.locales.length);
  });

  it("keeps a ui family at every route locale", async () => {
    const pricing = (await shard("en")).find((entry) => entry.url === `${BASE_URL}/pricing`);
    const languages = pricing?.alternates?.languages as Record<string, string>;

    expect(Object.keys(languages)).toHaveLength(routing.locales.length + 1);
  });

  it("publishes no `none`-scoped route in any shard", () => {
    const offenders = [...shards.values()]
      .flat()
      .map((entry) => entry.url)
      .filter((url) => /\/(opc|legal\/|blog\/(tag|author)\/)/.test(url));

    expect(offenders).toEqual([]);
  });

  it("still publishes the changelog family when the CMS is unreachable", async () => {
    // E2E_SKIP_CMS=1 is set in beforeAll — the offline path. A CMS blip must not
    // silently delete live URLs from the sitemap.
    const en = (await shard("en")).map((entry) => entry.url);
    const changelog = en.filter((url) => /\/changelog\/[^/]+$/.test(url));

    expect(changelog.length).toBeGreaterThan(0);
    expect(en).toContain(`${BASE_URL}/changelog/0.10.0`);
  });
});
