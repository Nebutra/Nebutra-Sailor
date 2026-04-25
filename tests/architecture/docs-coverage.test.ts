import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOCS_ROOT = resolve(ROOT, "apps/sailor-docs/content/docs");

function collectMdxPages(current = DOCS_ROOT): string[] {
  if (!existsSync(current)) return [];

  const pages: string[] = [];
  for (const entry of readdirSync(current)) {
    const absolute = resolve(current, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      pages.push(...collectMdxPages(absolute));
      continue;
    }

    if (entry.endsWith(".mdx")) {
      pages.push(absolute.replace(`${DOCS_ROOT}/`, "").replace(/\.mdx$/, ""));
    }
  }

  return pages.sort();
}

describe("Property 1: Docs Coverage", () => {
  const pages = collectMdxPages();

  it("every discovered docs page resolves to an .mdx file", () => {
    expect(pages.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...pages), (page) => {
        const exists = existsSync(resolve(DOCS_ROOT, `${page}.mdx`));
        if (!exists) {
          throw new Error(
            `Discovered docs page "${page}" does not resolve under apps/sailor-docs.`,
          );
        }
        return true;
      }),
      { numRuns: pages.length },
    );
  });

  it("docs content has at least 20 pages", () => {
    expect(pages.length).toBeGreaterThanOrEqual(20);
  });

  it("primary localized docs surfaces are populated", () => {
    const pagesByLocale = pages.reduce<Record<string, number>>((acc, page) => {
      const [locale] = page.split("/");
      acc[locale] = (acc[locale] ?? 0) + 1;
      return acc;
    }, {});

    expect(pagesByLocale.en).toBeGreaterThanOrEqual(20);
    expect(pagesByLocale.zh).toBeGreaterThanOrEqual(20);
  });
});
