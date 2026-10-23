import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "../../scripts/lib/strip-comments.mjs";

/**
 * One font pipeline (docs/reports/2026-10-16-frontend-foundation-audit.md).
 *
 * Measured in production before this existed: the auth center rendered in
 * ui-sans-serif and the IdP in Times, because their layouts composed
 * the loader classes by hand and left two of three out; every token stack that
 * opened with a bare var(--font-geist-sans) was then void. h1 weighed 400, 500
 * or 600 depending on the app. These assertions hold the shape that fixed it:
 * every app root takes the loader from @nebutra/tokens/fonts, every loader
 * variable in a stack carries a fallback, and heading weight has one source.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** The root layout of every app that renders Nebutra UI. */
const ROOT_LAYOUTS: Record<string, string> = {
  admin: "apps/admin/src/app/layout.tsx",
  auth: "apps/auth/src/app/layout.tsx",
  design: "apps/design/src/app/layout.tsx",
  forge: "apps/forge/src/app/layout.tsx",
  idp: "apps/idp/src/app/layout.tsx",
  kuanlan: "apps/kuanlan/src/app/layout.tsx",
  landing: "apps/landing/src/app/[lang]/layout.tsx",
  "mail-preview": "apps/mail-preview/src/app/layout.tsx",
  para: "apps/para/src/app/layout.tsx",
  router: "apps/router/src/app/layout.tsx",
  "sailor-docs": "apps/sailor-docs/src/app/[lang]/layout.tsx",
  sleptons: "apps/sleptons/src/app/layout.tsx",
  web: "apps/web/src/app/layout.tsx",
};

describe("one font pipeline", () => {
  for (const [app, file] of Object.entries(ROOT_LAYOUTS)) {
    it(`${app}: the root layout loads fonts from @nebutra/tokens/fonts`, () => {
      const src = read(file);
      expect(src, file).toMatch(
        /import \{[^}]*\bFontFaces\b[^}]*\bfontClassName\b[^}]*\} from "@nebutra\/tokens\/fonts";/,
      );
      // On <html>, not somewhere else: the variables must reach the root.
      expect(src, file).toMatch(/<html[^>]*?className=\{[^>]*fontClassName/);
      expect(src, file).toMatch(/<FontFaces\b/);
      // And nothing composes a loader string of its own any more.
      expect(stripComments(src), file).not.toMatch(
        /from\s*["'](?:geist\/font|@nebutra\/fonts\/next|next\/font)/,
      );
    });
  }

  it("every app with a src/app root is governed here or exempt in fontPipeline", () => {
    const cfg = JSON.parse(read("governance.config.json")).fontPipeline as {
      loaderExempt: Record<string, string>;
    };
    const roots = execFileSync("git", ["ls-files", "apps/*/src/app/layout.tsx"], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .map((f) => f.split("/")[1] as string);
    const governed = new Set(Object.keys(ROOT_LAYOUTS));
    const exempt = Object.keys(cfg.loaderExempt);
    const missing = roots.filter(
      (app) => !governed.has(app) && !exempt.some((p) => p.startsWith(`apps/${app}/`)),
    );
    expect(missing, "a new app root must load fonts the shared way").toEqual([]);
  });

  it("Storybook takes the same faces through the CSS path", () => {
    const css = read("apps/storybook/.storybook/preview.css");
    expect(css).toContain('@import "@nebutra/tokens/fonts.css";');
    expect(read("apps/storybook/.storybook/preview.tsx")).toContain(
      'from "@nebutra/tokens/fonts/faces"',
    );
    for (const face of [
      "geist-sans-variable.woff2",
      "geist-mono-variable.woff2",
      "dm-sans-variable.woff2",
    ]) {
      expect(existsSync(join(ROOT, "packages/design/tokens/fonts", face)), face).toBe(true);
    }
  });

  it("every loader variable in a shipped stack carries a family fallback", () => {
    // var(--font-geist-sans) with no fallback, undefined, voids the whole
    // font-family declaration — the auth / idp failure. The semantic stacks
    // (--font-sans, --font-heading, …) are always defined by the tokens and
    // are not loader variables.
    const SEMANTIC = /^--font-(sans|cn|display|heading|mono|cjk|primary|serif)$/;
    const sheets = [
      "packages/design/tokens/styles.css",
      "packages/design/theme/skins.css",
      ...execFileSync("git", ["ls-files", "packages/design/tokens/skins/*.css"], {
        encoding: "utf8",
      })
        .split("\n")
        .filter(Boolean),
    ];
    const bare: string[] = [];
    for (const sheet of sheets) {
      for (const m of read(sheet).matchAll(/var\((--font-[\w-]+)\)/g)) {
        if (!SEMANTIC.test(m[1] as string)) bare.push(`${sheet}: ${m[0]}`);
      }
    }
    expect(bare).toEqual([]);
  });

  it("heading weight has one source: core.json", () => {
    const core = JSON.parse(read("packages/design/design-tokens/tokens/core.json"));
    const weight = core.fontWeight.heading.$value as string;
    expect(weight).toBe("500");
    const styles = read("packages/design/tokens/styles.css");
    expect(styles).toContain(`--font-weight-heading: ${weight};`);
    // The registered property's initial value agrees (it was 600).
    expect(read("packages/design/tokens/recipe.css")).toMatch(
      new RegExp(`@property --font-weight-heading \\{[^}]*initial-value: ${weight};`),
    );
    // Every text-heading-* recipe reads the token instead of a literal 600/700.
    const base = read("packages/design/design-tokens/static/base.css");
    for (const m of base.matchAll(/@utility text-heading-\d+ \{([^}]*)\}/g)) {
      expect(m[1]).toContain("font-weight: var(--font-weight-heading");
    }
  });

  it("KaTeX's faces load only on the route that renders math", () => {
    expect(read("apps/landing/src/app/globals.css")).not.toMatch(/@import\s+["']katex/);
    expect(read("apps/landing/src/components/landing/blog-portable-text.tsx")).toContain(
      'import "katex/dist/katex.min.css";',
    );
  });
});
