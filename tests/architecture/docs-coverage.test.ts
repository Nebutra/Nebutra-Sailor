import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOCS_CONTENT = resolve(ROOT, "apps/sailor-docs/content/docs");

function extractPagesFromDocsContent(locale: string): string[] {
  const root = resolve(DOCS_CONTENT, locale);
  const pages: string[] = [];

  const walk = (current: string, prefix = "") => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = resolve(current, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".mdx")) {
        pages.push(relativePath.replace(/\.mdx$/, ""));
      }
    }
  };

  walk(root);
  return pages.sort();
}

function mdxFileExistsForPage(locale: string, page: string): boolean {
  const mdxPath = resolve(DOCS_CONTENT, locale, `${page}.mdx`);
  return existsSync(mdxPath);
}

describe("Property 1: Docs Coverage", () => {
  const locales = ["en", "zh"];

  it("every discovered docs page maps to an existing .mdx file", () => {
    const pages = locales.flatMap((locale) =>
      extractPagesFromDocsContent(locale).map((page) => ({ locale, page })),
    );
    expect(pages.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...pages), ({ locale, page }) => {
        const exists = mdxFileExistsForPage(locale, page);
        if (!exists) {
          throw new Error(
            `Page "${locale}/${page}" discovered but no .mdx file found at: apps/sailor-docs/content/docs/${locale}/${page}.mdx`,
          );
        }
        return true;
      }),
      { numRuns: pages.length },
    );
  });

  it("each docs locale has at least 20 pages", () => {
    for (const locale of locales) {
      expect(extractPagesFromDocsContent(locale).length).toBeGreaterThanOrEqual(20);
    }
  });

  it("email docs describe the implemented catalog-first package contract", async () => {
    const stalePatterns = [
      "getEmailProvider",
      "pnpm --filter @nebutra/email dev",
      "packages/email/src/templates",
      "six built-in",
      "All six",
      "六个内置",
      "所有六个",
    ];

    for (const locale of locales) {
      const emailRoot = resolve(DOCS_CONTENT, locale, "email");
      for (const entry of readdirSync(emailRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;

        const content = await readFile(resolve(emailRoot, entry.name), "utf8");
        for (const stalePattern of stalePatterns) {
          expect(
            content,
            `${locale}/email/${entry.name} should not mention ${stalePattern}`,
          ).not.toContain(stalePattern);
        }
      }
    }
  });
});
