import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COMPONENTS, COMPONENTS_BY_SLUG } from "@/lib/components/registry";
import { PATTERNS, PATTERNS_BY_SLUG } from "@/lib/pattern-data";
import { showcaseItem, showcaseItems } from "@/lib/showcase";
import nextConfig from "../../next.config";

/**
 * production design.nebutra.com answered 500 for unknown slugs: the standalone
 * image did not contain packages/design/ui/src (read with fs, so never traced),
 * and an unknown slug rendered the page module at request time, where
 * ui-source.ts throws at import. Two guards, one per half of that:
 *   - the source is traced into the standalone tree;
 *   - unknown params 404 without rendering, and every valid param is prerendered
 *     so none of them becomes a 404 by the switch.
 */

const APP_DIR = path.resolve(__dirname, "../..");

// The page modules hold JSX, which this package's `jsx: preserve` tsconfig keeps
// vitest from importing, so the route files are checked as source text.
function pageSource(route: string): string {
  return readFileSync(path.join(APP_DIR, "src/app", route, "page.tsx"), "utf8");
}

describe("standalone runtime reads", () => {
  const includes = Object.values(nextConfig.outputFileTracingIncludes ?? {}).flat();

  it("traces the ui source the component scan reads at runtime", () => {
    expect(includes).toContain("../../packages/design/ui/src/**/*");
  });

  it("traces the token source the pipeline and token model read at runtime", () => {
    expect(includes).toContain("../../packages/design/design-tokens/tokens/**/*");
    expect(includes).toContain("../../packages/design/tokens/styles.css");
  });

  it("only lists globs whose literal prefix exists, so a rename cannot rot them silently", () => {
    for (const glob of includes) {
      // The showcase glob uses `*` for the "(showcase)" route group; skip it.
      if (glob.startsWith("./src/app/")) continue;
      const literal = glob.split(/[*{]/u)[0] ?? glob;
      const probe = literal.endsWith("/") ? literal : path.dirname(literal);
      expect(existsSync(path.resolve(APP_DIR, probe)), glob).toBe(true);
    }
  });
});

describe("dynamic route params", () => {
  const routes = [
    ["(components)/components/[slug]", "COMPONENTS.map("],
    ["(patterns)/patterns/[slug]", "PATTERNS.map("],
    ["(showcase)/showcase/[id]", "showcaseItems().map("],
  ] as const;

  it.each(routes)("%s 404s unknown params without rendering", (route, list) => {
    const source = pageSource(route);
    expect(source).toMatch(/^export const dynamicParams = false;$/mu);
    // dynamicParams = false turns anything generateStaticParams omits into a 404,
    // so it must enumerate the same list the page looks the param up in.
    expect(source).toContain(list);
  });

  it("every listed component, pattern and showcase item resolves through the page lookup", () => {
    for (const entry of COMPONENTS)
      expect(COMPONENTS_BY_SLUG.get(entry.slug), entry.slug).toBe(entry);
    for (const entry of PATTERNS) expect(PATTERNS_BY_SLUG.get(entry.slug), entry.slug).toBe(entry);
    for (const item of showcaseItems()) expect(showcaseItem(item.id), item.id).toBe(item);
  });
});
