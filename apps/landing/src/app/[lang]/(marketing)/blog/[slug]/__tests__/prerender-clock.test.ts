import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const FILES = [
  "src/app/[lang]/(marketing)/blog/[slug]/page.tsx",
  "src/lib/blog-page-cache.ts",
  "src/lib/blog.ts",
];

describe("blog post prerender clock", () => {
  it.each(FILES)("does not read the current time in %s", (relative) => {
    const source = readFileSync(join(ROOT, relative), "utf8");

    expect(source).not.toMatch(/Date\.now\s*\(/u);
    expect(source).not.toMatch(/new Date\(\s*\)/u);
    expect(source).not.toMatch(/new Date\(\s*0\s*\)/u);
  });
});
