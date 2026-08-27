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

  it("only statically exports the empty blog placeholder slug", () => {
    const source = readFileSync(join(ROOT, FILES[0]), "utf8");

    expect(source).toContain("EMPTY_BLOG_PLACEHOLDER_SLUG");
    expect(source).toContain("prerenderDefaultLocale([{ slug: EMPTY_BLOG_PLACEHOLDER_SLUG }]");
    expect(source).not.toContain("posts.slice(0, 50)");
    expect(source).toContain("await connection()");
    expect(source).toContain("buildPageMetadata");
    expect(source).toContain("unpublishedSet(`/blog/${slug}`)");
    expect(source).toMatch(/if \(slug === EMPTY_BLOG_PLACEHOLDER_SLUG\) notFound\(\);/u);
  });
});
