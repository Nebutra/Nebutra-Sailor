import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// Source path, not the package export: the CI step that runs this suite does not
// build the workspace, so `@nebutra/brand/metadata` resolves to a dist file that
// does not exist there. Same import shape as brand-config-facts.test.ts.
import { brand } from "../../packages/design/brand/src/metadata";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf-8");

/**
 * Source with comment LINES removed. These guards are about what the code does,
 * and every file here discusses paths and redirects at length in prose — matching
 * that prose is how a guard like this turns into noise nobody reads.
 *
 * Line-based on purpose. A `/* … *\/` regex looks simpler and is wrong: these
 * files contain regex literals holding `*\/` (the proxy's matcher has
 * `.*\/opengraph-image`), which pairs with an earlier `/*` and swallows real
 * code between them. That silently emptied the source these assertions read —
 * they passed against nothing until the one that looked for a branch found none.
 */
function code(rel: string): string {
  const lines = read(rel).split("\n");
  const out: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlock) {
      if (trimmed.endsWith("*/")) inBlock = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.endsWith("*/")) inBlock = true;
      continue;
    }
    if (trimmed.startsWith("//")) continue;
    out.push(line);
  }

  return out.join("\n");
}

const DOCS_BASE_PATH = "/docs";

/**
 * Docs are a Next.js zone: a separate deployment mounted at `/docs` on the site
 * that owns them, reached by an identity forward. Two apps have to agree for
 * that to work, and nothing inside either app's own tests can see the agreement:
 *
 *   - landing forwards `/docs/*` to the upstream unchanged
 *   - the bundle sets the matching `basePath`, so every URL it emits — assets,
 *     internal links, redirect Locations, sitemap entries — is already in the
 *     `/docs` space the visitor is in
 *
 * Break either half and the failure is silent in unit tests and total in a
 * browser. The first shipped version mapped `/docs/<slug>` to
 * `<upstream>/<locale>/<slug>`: every stylesheet 404'd against landing's origin,
 * so `<site>/docs` rendered as unstyled HTML; the bundle's own redirects sent
 * visitors to `<site>/en/...` outside the docs; and the sitemap published
 * `/docs/en/<slug>`, paths that resolve to nothing. All three were one cause —
 * a proxy inventing a path mapping it cannot apply to what comes back.
 */
describe("docs zone seam", () => {
  it("mounts the bundle at the path landing forwards", () => {
    const config = code("apps/sailor-docs/next.config.ts");
    const routing = code("apps/landing/src/lib/docs-routing.ts");

    // The two halves of the contract, asserted against the same literal.
    expect(config).toContain(`?? "${DOCS_BASE_PATH}"`);
    expect(routing).toContain(`= "${DOCS_BASE_PATH}"`);
  });

  it("forwards the path unchanged — no segment added, removed or translated", () => {
    const routing = code("apps/landing/src/lib/docs-routing.ts");
    const rewrite = routing.slice(routing.indexOf("export function createDocsRewriteUrl"));
    const body = rewrite.slice(0, rewrite.indexOf("\n}"));

    // Identity is the whole guarantee. Assigning the request's own pathname is
    // what makes it identity; building a path from parts is what broke it.
    expect(body).toContain("target.pathname = requestUrl.pathname");
    expect(body).not.toContain("toContentLocale");
    expect(body).not.toContain("join(");
  });

  it("keeps the default locale out of public docs URLs", () => {
    const i18n = code("apps/sailor-docs/src/lib/i18n.ts");
    const routing = code("apps/landing/src/lib/docs-routing.ts");

    // The zone hides its default locale, so landing must not emit it either —
    // a `/docs/en/...` redirect target would hand the visitor a URL the zone
    // immediately redirects away from.
    expect(i18n).toContain('hideLocale: "default-locale"');
    expect(routing).toContain('DOCS_DEFAULT_LOCALE = "en"');
    expect(i18n).toContain('defaultLanguage: "en"');
  });

  it("builds outward URLs from the public path shape, never the internal one", () => {
    const sitemap = code("apps/sailor-docs/src/app/sitemap.ts");

    // `pathFor` yields the app's internal `/<lang>/<slug>`; `publicPathFor`
    // yields what a visitor can actually reach. A sitemap of the former is a
    // sitemap of 404s.
    expect(sitemap).toContain("publicPathFor");
    expect(sitemap).not.toMatch(/[^c]\bpathFor\(/);
  });

  it("gives the zone no robots.txt of its own", () => {
    // robots.txt is only honoured at a host root, so one under `/docs` is read
    // by nobody. The host site's file governs these pages and its sitemap index
    // carries the zone's sitemap.
    const index = code("apps/landing/src/app/sitemap-index.xml/route.ts");

    expect(() => read("apps/sailor-docs/src/app/robots.ts")).toThrow();
    expect(index).toContain(`DOCS_SITEMAP_PATH = "${DOCS_BASE_PATH}/sitemap.xml"`);
  });

  it("rewrites the zone on the landing side, and redirects only its own shapes", () => {
    const proxy = code("apps/landing/src/proxy.ts");

    const zone = proxy.slice(proxy.indexOf("if (docsRewriteUrl)"));
    expect(zone.slice(0, zone.indexOf("}") + 1)).toContain("NextResponse.rewrite");

    // `/<locale>/docs/*` is landing's own path space, so redirecting it is safe
    // and correct — it is the one docs redirect this app may emit.
    const legacy = proxy.slice(proxy.indexOf("if (docsLocaleRedirectPath)"));
    expect(legacy.slice(0, legacy.indexOf("}") + 1)).toContain("NextResponse.redirect");
  });

  it("gives the zone root a route the middleware actually reaches", () => {
    const middleware = code("apps/sailor-docs/src/middleware.ts");

    // Under basePath, Next prefixes every matcher, so `/((?!…).*)` never matches
    // bare `/docs` — the zone root 404'd while every page under it worked. The
    // root has to be listed on its own.
    expect(middleware).toContain("rewriteZoneRoot");
    expect(middleware).toMatch(/matcher:\s*\[\s*"\/"/);
  });

  it("takes the upstream origin from the deployment, with no instance default", () => {
    const routing = code("apps/landing/src/lib/docs-routing.ts");

    // A hardcoded origin would put instance infrastructure in template code and
    // make /docs silently serve the wrong tree in a fork. The forbidden literal
    // is derived from brand config rather than spelled out, because spelling it
    // here is itself what template-boundary refuses to ship.
    expect(routing).toContain("process.env.DOCS_UPSTREAM_ORIGIN");
    expect(routing).not.toContain(brand.domains.landing);
    expect(routing).not.toMatch(/\bhttps?:\/\//);
  });
});
