import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * L3 build-scale governance guard.
 *
 * Rule: a `generateStaticParams` that uses the eager combinatorial pattern
 * (routing.locales.flatMap( ... .map()) multiplies locale count × dataset size
 * into static pages at build time. With even 2 locales and a 200-item dataset
 * that is 400 pages pre-rendered — a build-scale hazard for large catalogs.
 *
 * A route MAY multiply locales × a dataset ONLY when it also exports
 * `dynamicParams = true`, which gates on-demand ISR for unprerendered
 * locale/id combinations and caps the static pre-warm to a seed set.
 *
 * Safe patterns (always PASS):
 *   - routing.locales.map(l => ({ lang: l }))          — locale-only, no dataset
 *   - dataset.map(item => ({ lang: defaultLocale, ... })) — single-locale seed
 *   - routing.locales.flatMap(...) + dynamicParams = true — opted into on-demand
 *   - no generateStaticParams at all
 *
 * Forbidden pattern (FAIL unless dynamicParams = true is also present):
 *   - routing.locales.flatMap(locale => dataset.map(item => ({ lang: locale, ... })))
 */

const ROOT = resolve(import.meta.dirname, "../..");
const LANDING_APP = resolve(ROOT, "apps/landing-page/src/app");

/** Collect all page.tsx files inside dynamic-segment route folders (folders
 *  whose name starts with "["). This is the scope the task specifies:
 *  `apps/landing-page/src/app/**\/[*]*\/page.tsx` */
function collectDynamicRoutePagesUnder(dir: string, pages: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectDynamicRoutePagesUnder(full, pages);
    } else if (entry === "page.tsx") {
      // Include only pages that live inside at least one dynamic segment directory.
      // A "dynamic segment directory" is any ancestor folder whose name starts with "[".
      const rel = relative(LANDING_APP, full);
      const parts = rel.split("/");
      const insideDynamicSegment = parts.slice(0, -1).some((p) => p.startsWith("["));
      if (insideDynamicSegment) {
        pages.push(full);
      }
    }
  }
  return pages;
}

/**
 * Returns true when the file content contains the eager combinatorial pattern:
 * `routing.locales.flatMap(` followed (anywhere in the function body) by `.map(`.
 *
 * Strategy: find the `generateStaticParams` function block, then look for
 * `routing.locales.flatMap(` inside it, then check that a second `.map(` also
 * appears within that same function body (indicating a nested dataset iteration).
 *
 * We extract the function body by counting braces from the opening `{` after
 * the function signature — robust for single-level nesting without a full AST.
 */
function hasEagerCombinatorialPattern(src: string): boolean {
  // Quick exit: no flatMap at all → cannot be combinatorial
  if (!src.includes("flatMap(")) return false;
  if (!src.includes("routing.locales")) return false;

  // Find generateStaticParams declaration (sync or async, export or not)
  const fnStart = src.search(/\bgenerateStaticParams\s*\(/);
  if (fnStart === -1) return false;

  // Advance to the opening brace of the function body
  const bodyStart = src.indexOf("{", fnStart);
  if (bodyStart === -1) return false;

  // Walk forward counting braces to find the matching closing brace
  let depth = 0;
  let bodyEnd = -1;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        bodyEnd = i;
        break;
      }
    }
  }
  if (bodyEnd === -1) return false;

  const body = src.slice(bodyStart, bodyEnd + 1);

  // The combinatorial pattern: routing.locales.flatMap( … .map(
  // Both must appear inside the same generateStaticParams body.
  return /routing\.locales\.flatMap\(/.test(body) && /\.map\(/.test(body);
}

/** Returns true when the file exports `dynamicParams = true` at the module level. */
function hasDynamicParamsTrue(src: string): boolean {
  // Match: export const dynamicParams = true;
  return /export\s+const\s+dynamicParams\s*=\s*true\b/.test(src);
}

// ---------------------------------------------------------------------------

describe("Landing build-scale governance (L3)", () => {
  const dynamicRoutePages = collectDynamicRoutePagesUnder(LANDING_APP);

  it("finds at least one dynamic route page to scan (smoke-check path resolution)", () => {
    expect(dynamicRoutePages.length).toBeGreaterThan(0);
  });

  it("no route uses eager locale×dataset combinatorial generateStaticParams without dynamicParams = true", () => {
    const violations: string[] = [];

    for (const pagePath of dynamicRoutePages) {
      const src = readFileSync(pagePath, "utf-8");

      if (hasEagerCombinatorialPattern(src) && !hasDynamicParamsTrue(src)) {
        violations.push(relative(ROOT, pagePath));
      }
    }

    expect(
      violations,
      [
        "The following routes use routing.locales.flatMap(...dataset.map(...)) in",
        "generateStaticParams without exporting `dynamicParams = true`.",
        "Either opt into on-demand ISR (add `export const dynamicParams = true;`)",
        "or replace the combinatorial expansion with a single-locale seed pattern.",
        "",
        ...violations.map((v) => `  - ${v}`),
      ].join("\n"),
    ).toHaveLength(0);
  });

  it("all current dynamic route pages pass the guard (zero false positives)", () => {
    // This test documents that every route in the current codebase satisfies the
    // rule: either no combinatorial pattern, or combinatorial + dynamicParams=true.
    const results = dynamicRoutePages.map((pagePath) => {
      const src = readFileSync(pagePath, "utf-8");
      const combinatorial = hasEagerCombinatorialPattern(src);
      const opted = hasDynamicParamsTrue(src);
      const passes = !combinatorial || opted;
      return { path: relative(ROOT, pagePath), combinatorial, opted, passes };
    });

    const failing = results.filter((r) => !r.passes);
    expect(
      failing.map((r) => r.path),
      "Expected zero violations in the current codebase",
    ).toHaveLength(0);
  });
});
