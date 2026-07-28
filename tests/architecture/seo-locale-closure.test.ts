import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEGACY_LOCALE_PREFIXES, ROUTE_LOCALES } from "../../packages/platform/i18n/src/locales";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APPS_DIR = join(ROOT, "apps");

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

/** Comments are prose, not emitted URLs — a `/zh` example in a doc block is fine. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function appNames(): string[] {
  return readdirSync(APPS_DIR)
    .filter((name) => statSync(join(APPS_DIR, name)).isDirectory())
    .filter((name) => existsSync(join(APPS_DIR, name, "package.json")))
    .sort();
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : walk(full);
    }
    return [full];
  });
}

// ── Guard 1: proxy matcher drift ──────────────────────────────────────────
//
// Next requires `config.matcher` entries to be statically analyzable string
// literals, so the locale alternation in apps/landing/src/proxy.ts cannot be
// computed from ROUTE_LOCALES. This is the one place a guard is the correct
// tool rather than a structural fix.
describe("landing proxy locale matcher", () => {
  const PROXY_PATH = "apps/landing/src/proxy.ts";
  const ALTERNATION = /"\/:locale\(([^)]+)\)\/docs\/:path\*"/;

  function matcherLocales(): string[] {
    const match = ALTERNATION.exec(read(PROXY_PATH));
    if (!match?.[1]) {
      throw new Error(
        `[seo] Could not find the /:locale(...)/docs/:path* matcher in ${PROXY_PATH}. ` +
          `If the matcher shape changed, update this guard alongside it.`,
      );
    }
    return match[1].split("|");
  }

  /** The literal to paste back into proxy.ts when this guard fails. */
  function expectedLiteral(): string {
    return `"/:locale(${[...ROUTE_LOCALES, "zh"].join("|")})/docs/:path*"`;
  }

  it("covers every route locale", () => {
    const present = new Set(matcherLocales());
    const missing = ROUTE_LOCALES.filter((locale) => !present.has(locale));

    expect(
      missing,
      `Route locales missing from the matcher. Expected literal:\n${expectedLiteral()}`,
    ).toEqual([]);
  });

  it("keeps the bare-zh legacy prefix matched so its 308 can fire", () => {
    // /zh was a crawled URL shape before the multi-script migration. It must
    // reach the proxy to be redirected to /zh-Hans; an unmatched path 404s.
    expect(matcherLocales()).toContain("zh");
  });

  it("contains nothing beyond route locales and legacy alias prefixes", () => {
    const known = new Set<string>([...ROUTE_LOCALES, ...LEGACY_LOCALE_PREFIXES]);
    const unknown = matcherLocales().filter((locale) => !known.has(locale));

    expect(unknown, "Matcher segments that are neither a route locale nor a locale alias").toEqual(
      [],
    );
  });

  it("lists each locale exactly once", () => {
    const locales = matcherLocales();
    const duplicates = locales.filter((locale, index) => locales.indexOf(locale) !== index);

    expect(duplicates).toEqual([]);
  });
});

// ── Guard 2: no bare-/zh URL literals in routing / SEO modules ────────────
describe("bare-zh URL literals", () => {
  const SEO_MODULE_BASENAMES = new Set([
    "docs-links.ts",
    "docs-routing.ts",
    "i18n.ts",
    "json-ld.ts",
    "metadata.ts",
    "robots.ts",
    "route-registry.ts",
    "routing.ts",
    "site-routes.ts",
    "sitemap.ts",
  ]);

  /**
   * Shrink-only allowlist. Bare `zh` is a real ContentLocale (it is simply never
   * a *route* locale), so a handful of files legitimately emit a `/zh` segment.
   * Entries migrate on touch; the list may only shrink.
   */
  const KNOWN_BARE_ZH: Readonly<Record<string, string>> = {
    "apps/sailor-docs/next.config.ts":
      "docs origin serves /<contentLocale>/<slug> with languages ['en','zh']; these are its own back-compat 301 sources.",
    "apps/design-docs/next.config.ts":
      "internal design-docs origin (robots-disallowed) keeps a /zh/docs MDX rewrite for its own bilingual axis.",
  };

  function candidateFiles(): string[] {
    const fromSrc = appNames().flatMap((app) =>
      walk(join(APPS_DIR, app, "src")).filter((file) => {
        const base = file.split("/").pop() ?? "";
        return SEO_MODULE_BASENAMES.has(base) && !base.includes(".test.");
      }),
    );
    const fromConfig = appNames()
      .map((app) => join(APPS_DIR, app, "next.config.ts"))
      .filter((file) => existsSync(file));
    return [...fromSrc, ...fromConfig].sort();
  }

  it("keeps routing and SEO modules free of unlisted /zh path literals", () => {
    // Non-vacuity: the scan must actually see the routing/SEO surface.
    expect(candidateFiles().length).toBeGreaterThan(10);

    const offenders = candidateFiles()
      .map((file) => ({
        file: relative(ROOT, file),
        code: stripComments(readFileSync(file, "utf8")),
      }))
      .filter(({ code }) => /\/zh(?=["'`/])/.test(code))
      .map(({ file }) => file)
      .filter((file) => !(file in KNOWN_BARE_ZH));

    expect(
      offenders,
      "Bare /zh is not a route locale (ROUTE_LOCALES uses zh-Hans / zh-Hant). Emit " +
        "toRouteLocale(...) output, or allowlist the file with a reason if it targets " +
        "a ContentLocale axis.",
    ).toEqual([]);
  });

  it("keeps every allowlist entry real, so the list can only shrink", () => {
    const stale = Object.keys(KNOWN_BARE_ZH).filter((file) => {
      if (!existsSync(join(ROOT, file))) return true;
      return !/\/zh(?=["'`/])/.test(stripComments(read(file)));
    });

    expect(stale, "Allowlisted files that no longer need the exemption — delete them").toEqual([]);
  });
});

// ── Guard 3: exactly one robots posture per app ───────────────────────────
describe("per-app robots posture", () => {
  /**
   * Public origins that own canonical + hreflang + sitemap infrastructure.
   *
   * `forge` and `router` moved here on 2026-07-27. They previously shipped a
   * static `public/robots.txt` reading `Disallow: /` alongside an
   * `app/robots.ts` that allowed indexing and advertised a sitemap. Next serves
   * the dynamic one, so the static file was both stale and already losing; it
   * was deleted rather than the route.
   */
  // tsekaluk-dev extracted 2026-07-27 → github.com/TsekaLuk/tsekaluk-dev
  const INDEXABLE = ["landing", "sailor-docs", "forge", "router"];

  /** Everything else: internal tooling or authenticated product surfaces. */
  const DISALLOWED = [
    "auth",
    "design-docs",
    "idp",
    "mail-preview",
    "sleptons",
    "studio",
    "typelens",
    "web",
  ];

  /**
   * Apps with no static asset root to serve /robots.txt from. apps/storybook
   * builds to storybook-static/ and declares no `staticDirs`, so there is no
   * place to put the file.
   */
  const NO_ROBOTS_SURFACE = ["storybook"];

  it("classifies every app exactly once", () => {
    const classified = [...INDEXABLE, ...DISALLOWED, ...NO_ROBOTS_SURFACE];
    const duplicates = classified.filter((app, i) => classified.indexOf(app) !== i);

    expect(duplicates).toEqual([]);
    expect(
      appNames().filter((app) => !classified.includes(app)),
      "New app with no declared robots posture — add it to INDEXABLE or DISALLOWED here " +
        "and ship the matching robots file.",
    ).toEqual([]);
    expect(classified.filter((app) => !appNames().includes(app))).toEqual([]);
  });

  it("never ships two robots sources for one origin", () => {
    // apps/web once shipped both, with opposite directives.
    const both = appNames().filter(
      (app) =>
        existsSync(join(APPS_DIR, app, "public/robots.txt")) &&
        existsSync(join(APPS_DIR, app, "src/app/robots.ts")),
    );

    expect(both, "Apps with both a static robots.txt and an app-router robots.ts").toEqual([]);
  });

  it("actually disallows every non-public app", () => {
    const notDisallowed = DISALLOWED.filter((app) => {
      const file = join(APPS_DIR, app, "public/robots.txt");
      if (!existsSync(file)) return true;
      const body = readFileSync(file, "utf8");
      const wildcardGroup = body.slice(body.indexOf("User-agent: *"));
      return !body.includes("User-agent: *") || !/^Disallow:\s*\/\s*$/m.test(wildcardGroup);
    });

    expect(
      notDisallowed,
      "Non-public apps must ship public/robots.txt with `User-agent: *` + `Disallow: /`",
    ).toEqual([]);
  });

  it("gives every indexable origin a robots source", () => {
    const missing = INDEXABLE.filter(
      (app) =>
        !existsSync(join(APPS_DIR, app, "src/app/robots.ts")) &&
        !existsSync(join(APPS_DIR, app, "public/robots.txt")),
    );

    expect(missing).toEqual([]);
  });
});

// ── Guard 4: sitemap honesty ──────────────────────────────────────────────
describe("sitemap lastmod honesty", () => {
  it("never stamps build time into a sitemap", () => {
    // A uniform build timestamp is the exact pattern crawlers classify as
    // untrustworthy and discard — worse than omitting <lastmod>.
    const sitemaps = appNames()
      .map((app) => join(APPS_DIR, app, "src/app/sitemap.ts"))
      .filter((file) => existsSync(file));

    // Non-vacuity: landing + sailor-docs + forge/router own sitemaps.
    expect(sitemaps.length).toBeGreaterThanOrEqual(3);

    const offenders = sitemaps
      .filter((file) => /new Date\(\s*\)/.test(stripComments(readFileSync(file, "utf8"))))
      .map((file) => relative(ROOT, file));

    expect(offenders, "Use a content date or a git-derived manifest, or omit lastModified").toEqual(
      [],
    );
  });
});

// ── Guard 5: generated lastmod manifest covers the registry ───────────────
describe("route lastmod manifest", () => {
  const GENERATED = "apps/landing/src/lib/seo/route-lastmod.generated.ts";
  const REGISTRY = "apps/landing/src/lib/seo/route-registry.ts";

  it("is generated, not hand-edited", () => {
    expect(existsSync(join(ROOT, GENERATED))).toBe(true);
    expect(read(GENERATED)).toContain("AUTO-GENERATED by scripts/generate-route-lastmod.mjs");
  });

  it("has an entry for every registered route pattern", () => {
    const patterns = [...read(REGISTRY).matchAll(/pattern:\s*"([^"]+)"/g)].map((m) => m[1]);
    const keys = new Set([...read(GENERATED).matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]));

    expect(patterns.length).toBeGreaterThan(0);
    expect(
      patterns.filter((pattern) => !keys.has(pattern)),
      `Registry patterns missing from ${GENERATED} — run \`pnpm gen:route-lastmod\``,
    ).toEqual([]);
  });

  it("has no orphan entries left behind by a deleted route", () => {
    const patterns = new Set(
      [...read(REGISTRY).matchAll(/pattern:\s*"([^"]+)"/g)].map((m) => m[1]),
    );
    const keys = [...read(GENERATED).matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]);

    expect(
      keys.filter((key) => !patterns.has(key as string)),
      `Stale entries in ${GENERATED} — run \`pnpm gen:route-lastmod\``,
    ).toEqual([]);
  });
});

// ── Shared: the landing route inventory ───────────────────────────────────
//
// A Next filesystem route and a hand-maintained registry cannot be made
// structurally identical — the registry carries a scope decision the filesystem
// cannot express. This is one of the few places a guard is the correct tool
// rather than a structural fix.
const LANDING_APP_ROOT = join(ROOT, "apps/landing/src/app/[lang]");
const LANDING_REGISTRY = "apps/landing/src/lib/seo/route-registry.ts";

function landingPageFiles(): string[] {
  return walk(LANDING_APP_ROOT)
    .filter((file) => /\/page\.tsx?$/.test(file))
    .sort();
}

/**
 * apps/landing/src/app/[lang]/(marketing)/blog/[slug]/page.tsx → "/blog/*".
 * Same transform as scripts/generate-route-lastmod.mjs routePathForPageFile —
 * keep the two aligned.
 */
function routePathForPageFile(file: string): string {
  const segments = relative(LANDING_APP_ROOT, dirname(file))
    .split("/")
    .filter((segment) => segment && !segment.startsWith("("))
    .map((segment) => (segment.startsWith("[") ? "*" : segment));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function registryPatterns(): Set<string> {
  return new Set([...read(LANDING_REGISTRY).matchAll(/pattern:\s*"([^"]+)"/g)].map((m) => m[1]));
}

// ── Guard 6: the registry covers the filesystem route inventory ───────────
describe("landing route registry coverage", () => {
  /**
   * Shrink-only. Every entry is a route the filesystem serves but the registry
   * does not classify, so `localizationFor` cannot answer for it and the
   * sitemap silently skips it. Each must gain an explicit scope — `none` for
   * redirect stubs, thin facets and duplicate surfaces — and then be deleted
   * from here. The list may only shrink.
   */
  const KNOWN_UNREGISTERED_ROUTES: Readonly<Record<string, string>> = {
    // Empty: every filesystem route now carries an explicit scope. Adding an
    // entry here is a deliberate, reviewable exception — the list may only
    // shrink, and the staleness sub-guard below deletes it the moment the route
    // is registered.
  };

  it("classifies every route the filesystem serves", () => {
    const derived = [...new Set(landingPageFiles().map(routePathForPageFile))].sort();

    // Non-vacuity: the walk must actually see the landing route tree.
    expect(derived.length).toBeGreaterThan(30);

    // Exact string equality, not wildcard resolution: an unlisted
    // `/blog/author/*` must fail even though `/blog/*` would resolve it,
    // because a broader wildcard silently lends it a scope nobody chose.
    const patterns = registryPatterns();
    const unregistered = derived
      .filter((path) => !patterns.has(path))
      .filter((path) => !(path in KNOWN_UNREGISTERED_ROUTES));

    expect(
      unregistered,
      `Routes with no entry in ${LANDING_REGISTRY}. Add each with an explicit ` +
        "scope — `none` for redirect stubs, thin facets and duplicate surfaces — " +
        "so the sitemap and buildPageMetadata agree on whether it is canonical.",
    ).toEqual([]);
  });

  it("keeps every unregistered-route exemption real, so the list can only shrink", () => {
    const derived = new Set(landingPageFiles().map(routePathForPageFile));
    const patterns = registryPatterns();

    const stale = Object.keys(KNOWN_UNREGISTERED_ROUTES).filter(
      (path) => !derived.has(path) || patterns.has(path),
    );

    expect(
      stale,
      "Exemptions that are now registered, or whose route no longer exists — delete them",
    ).toEqual([]);
  });

  it("has no exact pattern without a page, so a deleted route leaves no phantom URL", () => {
    const derived = new Set(landingPageFiles().map(routePathForPageFile));
    const phantom = [...registryPatterns()]
      .filter((pattern) => !pattern.includes("*"))
      .filter((pattern) => !derived.has(pattern))
      .sort();

    expect(
      phantom,
      `Registry patterns in ${LANDING_REGISTRY} with no page directory — the sitemap ` +
        "would publish a URL nothing serves.",
    ).toEqual([]);
  });
});

// ── Guard 7: every page declares its own canonical ────────────────────────
describe("landing page canonicals", () => {
  /**
   * Shrink-only. apps/landing/src/app/[lang]/layout.tsx calls
   * buildPageMetadata({ path: "/" }), and Next merges metadata shallowly per
   * top-level key — so a page that exports generateMetadata without setting
   * `alternates` inherits the LAYOUT's, i.e. rel=canonical pointing at the
   * origin root plus the homepage's full locale cluster. Pages that hand-roll
   * `alternates` instead emit a bare relative canonical with no hreflang.
   *
   * Every entry migrates by returning buildPageMetadata({ ..., path, locale }).
   */
  const KNOWN_HAND_ROLLED_METADATA: Readonly<Record<string, string>> = {
    // Empty: every page that exports generateMetadata now routes through
    // buildPageMetadata, so no page inherits the layout's homepage canonical
    // and none hand-rolls a bare relative one. The list may only shrink.
  };

  function pagesWithOwnMetadata(): { file: string; source: string }[] {
    return landingPageFiles()
      .map((file) => ({ file: relative(ROOT, file), source: readFileSync(file, "utf8") }))
      .filter(({ source }) => /export\s+(?:async\s+)?function\s+generateMetadata/.test(source));
  }

  it("routes every page's generateMetadata through buildPageMetadata", () => {
    // Non-vacuity: most landing pages export generateMetadata.
    expect(pagesWithOwnMetadata().length).toBeGreaterThan(20);

    const offenders = pagesWithOwnMetadata()
      .filter(({ source }) => !source.includes("buildPageMetadata"))
      .map(({ file }) => file)
      .filter((file) => !(file in KNOWN_HAND_ROLLED_METADATA))
      .sort();

    expect(
      offenders,
      'apps/landing/src/app/[lang]/layout.tsx sets alternates for path "/", and Next ' +
        "merges metadata shallowly per top-level key — a page that omits `alternates` " +
        "silently canonicalizes to the origin root. Return buildPageMetadata({ title, " +
        "description, path, locale }) instead of a hand-built Metadata object.",
    ).toEqual([]);
  });

  it("keeps every hand-rolled-metadata exemption real, so the list can only shrink", () => {
    const byFile = new Map(pagesWithOwnMetadata().map(({ file, source }) => [file, source]));

    const stale = Object.keys(KNOWN_HAND_ROLLED_METADATA).filter((file) => {
      const source = byFile.get(file);
      return source === undefined || source.includes("buildPageMetadata");
    });

    expect(
      stale,
      "Exemptions whose page now uses buildPageMetadata (or no longer exists) — delete them",
    ).toEqual([]);
  });
});

// ── Guard 8: the route-lastmod trigger covers what the generator reads ────
//
// The workflow's `paths:` filter and the generator's inputs live in different
// languages and cannot be derived from one another, so this is one of the few
// places a guard is the right tool. Two failure modes it locks:
//
//   1. `apps/landing/src/app/[lang]/**` unescaped — GitHub Actions reads
//      `[...]` as a character class, so that pattern matches `.../l/**`,
//      `.../a/**`, `.../n/**`, `.../g/**` and never the literal segment. The
//      workflow then never fires and the committed snapshot rots silently.
//   2. A DATA_DEPENDENCIES module missing from the filter — touching
//      `src/lib/blog.ts` changes what `/blog` and `/blog/*` render, so it must
//      re-trigger the refresh.
describe("route-lastmod workflow trigger", () => {
  const WORKFLOW = ".github/workflows/route-lastmod.yml";
  const GENERATOR = "scripts/generate-route-lastmod.mjs";

  it("escapes the [lang] segment so the filter can match it", () => {
    const yaml = read(WORKFLOW);

    expect(yaml).toContain("apps/landing/src/app/\\[lang\\]/**");
    expect(
      /["']apps\/landing\/src\/app\/\[lang\]\//.test(yaml),
      "Unescaped [lang] is a character class — it can never match the directory it names",
    ).toBe(false);
  });

  it("triggers on every module the generator folds into a timestamp", () => {
    const generator = read(GENERATOR);
    const block = generator.slice(
      generator.indexOf("const DATA_DEPENDENCIES"),
      generator.indexOf("function readRegistryPatterns"),
    );
    const dependencies = [...new Set([...block.matchAll(/"(src\/[^"]+)"/g)].map((m) => m[1]))];

    // Non-vacuity: the generator really does declare data dependencies.
    expect(dependencies.length).toBeGreaterThan(3);

    const yaml = read(WORKFLOW);
    const missing = dependencies.filter((dep) => !yaml.includes(`apps/landing/${dep}`));

    expect(
      missing,
      `Modules read by ${GENERATOR} but absent from the ${WORKFLOW} paths filter — ` +
        "a change to one of these leaves the committed snapshot stale with no refresh run.",
    ).toEqual([]);
  });
});
