import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_ROUTE_LOCALE } from "@nebutra/i18n/locales";
import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { seoFor } from "./alternates";

describe("seoFor", () => {
  it("gives a ui page a reciprocal cluster over every route locale", () => {
    const seo = seoFor("/about", "ja", "ui");

    expect(seo.robots).toBeUndefined();
    expect(seo.alternates.canonical).toBe("https://tsekaluk.dev/ja/about");
    expect(Object.keys(seo.alternates.languages ?? {})).toHaveLength(routing.locales.length + 1);
    // Bare `zh` is not a route locale; the router cannot resolve it.
    expect(seo.alternates.languages).not.toHaveProperty("zh");
    expect(Object.values(seo.alternates.languages ?? {})).not.toContain(
      "https://tsekaluk.dev/zh/about",
    );
  });

  it("noindexes a content page outside its single authored locale", () => {
    expect(routing.locales.length).toBeGreaterThan(1);

    const surrogate = seoFor("/thinking/essay", "ja", "content");

    // The sitemap publishes exactly one URL for an essay. Without robots the
    // other 33 stay indexable and self-canonical, so the duplicate set is
    // merely hidden from the sitemap rather than removed.
    expect(surrogate.robots).toEqual({ index: false, follow: true });
    expect(surrogate.alternates.canonical).toBe(
      `https://tsekaluk.dev/${DEFAULT_ROUTE_LOCALE}/thinking/essay`,
    );
    // A non-member must not advertise a cluster it is absent from.
    expect(surrogate.alternates.languages).toBeUndefined();

    const primary = seoFor("/thinking/essay", DEFAULT_ROUTE_LOCALE, "content");
    expect(primary.robots).toBeUndefined();
    expect(Object.keys(primary.alternates.languages ?? {})).toHaveLength(2);
  });
});

/** Every page must derive its SEO block; none may hand-roll one. */
describe("page metadata sources", () => {
  const APP = join(process.cwd(), "src/app");

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return /\/(page|layout)\.tsx$/.test(full) ? [full] : [];
    });
  }

  it("leaves no hand-written locale cluster or origin literal in a route file", () => {
    const files = walk(APP).map((file) => ({ file, source: readFileSync(file, "utf8") }));

    // Non-vacuity: the walk must actually see the route tree.
    expect(files.length).toBeGreaterThan(8);

    const offenders = files
      .filter(
        ({ source }) =>
          /languages:\s*\{/.test(source) || /["'`]https:\/\/tsekaluk\.dev/.test(source),
      )
      .map(({ file }) => file.replace(`${process.cwd()}/`, ""));

    expect(
      offenders,
      "Route files must call seoFor()/BASE_URL from src/lib/seo/alternates.ts — a hand-written " +
        "cluster reintroduces the unroutable bare `zh` and a second origin literal.",
    ).toEqual([]);
  });
});
