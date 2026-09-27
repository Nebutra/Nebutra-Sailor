import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FOOTER_COLUMNS } from "../lib/constants/footer-links";
import { NAV_LINKS } from "../lib/constants/landing-data";
import { RESOURCES } from "../lib/constants/resources-data";
import { hereOnly, pageAt } from "../site-map";

/**
 * The navigation and footer are shared by the Nebutra site and the Sailor template;
 * site-map.ts decides which links each one shows. A link whose path is not in
 * the map is not "hidden on the template" — it is a typo, and it would vanish
 * silently from both sites. So every internal link must resolve.
 */
// Static imports: loading the nav data (icons included) takes seconds on a
// busy machine, and inside a test that counted against its timeout.
const collect = () =>
  [...NAV_LINKS, ...FOOTER_COLUMNS.flatMap((c) => c.links), ...RESOURCES] as { href?: string }[];

describe("site links", () => {
  it("every internal link names a page in the site map", () => {
    const internal = collect().flatMap((l) => (l.href?.startsWith("/") ? [l.href] : []));
    expect(internal.filter((href) => !pageAt(href.split(/[?#]/)[0] ?? href))).toEqual([]);
  });

  it("the Nebutra site shows every link", () => {
    const links = collect();
    expect(hereOnly(links)).toHaveLength(links.length);
  });
});

describe("site links on the template", () => {
  it("drops links to Nebutra's own pages and Nebutra-only external links", async () => {
    vi.resetModules();
    vi.doMock("../site.config", () => ({ SITE_ID: "template" }));
    const { belongsHere } = await import("../site-map");
    const { FOOTER_COLUMNS_HERE } = await import("../lib/constants/footer-links");
    const { RESOURCE_GROUPS_HERE, getGroupResources } = await import(
      "../lib/constants/resources-data"
    );

    expect(belongsHere({ href: "/pricing" })).toBe(true);
    expect(belongsHere({ href: "/blog/some-essay" })).toBe(true);
    expect(belongsHere({ href: "/about" })).toBe(false);
    expect(belongsHere({ href: "/solutions" })).toBe(false);
    expect(belongsHere({ href: "https://example.com", site: "nebutra" })).toBe(false);
    expect(belongsHere({ href: "https://example.com" })).toBe(true);

    const footerHrefs = FOOTER_COLUMNS_HERE.flatMap((c) => c.links.map((l) => l.href));
    expect(footerHrefs).not.toContain("/about");
    expect(footerHrefs).toContain("/privacy");
    const resourceHrefs = RESOURCE_GROUPS_HERE.flatMap((g) =>
      getGroupResources(g).map((r) => r.href),
    );
    expect(resourceHrefs).not.toContain("/open");
    expect(resourceHrefs).toContain("/blog");
    vi.doUnmock("../site.config");
  });
});

/**
 * template-build puts `X.for-template.ts` in place of `X.ts`. The swap is only safe
 * if the template variant exports everything the original does — otherwise
 * the template stops compiling, and nothing in this repo would notice.
 */
describe("template variants", () => {
  const SRC = join(__dirname, "..");
  const variants: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === "node_modules") continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.for-template\.tsx?$/.test(name)) variants.push(p);
    }
  };
  walk(SRC);
  const exportsOf = (file: string) =>
    [
      ...readFileSync(file, "utf8").matchAll(
        /export\s+(?:default\s+)?(?:async\s+)?(?:const|function|class|type|interface)?\s*(\w+)/g,
      ),
    ]
      .map((m) => m[1])
      .sort();

  it("exist", () => {
    expect(variants.length).toBeGreaterThan(0);
  });

  it.each(
    variants.map((v) => [relative(SRC, v), v]),
  )("%s exports what the file it replaces exports", (_, variant) => {
    const original = variant.replace(/\.for-template(\.tsx?)$/, "$1");
    // Next.js reads a route file by convention and nothing imports it, so a
    // route variant only has to be a page (a default export). Every other
    // variant replaces a module something imports, name for name.
    if (/\/app\/.*\/(page|layout)\.for-template\.tsx$/.test(variant)) {
      expect(readFileSync(variant, "utf8")).toMatch(/export default /);
    } else {
      expect(exportsOf(variant)).toEqual(exportsOf(original));
    }
  });
});

describe("SEO route registry", () => {
  it("indexes only pages the site map lists", async () => {
    vi.resetModules();
    const { pageAt } = await import("../site-map");
    const { SEO_ROUTE_REGISTRY } = await import("../lib/seo/route-registry");
    const stray = SEO_ROUTE_REGISTRY.map((e) => e.pattern.replace(/\/\*$/, "/x")).filter(
      (p) => !pageAt(p),
    );
    expect(stray).toEqual([]);
  });
});
