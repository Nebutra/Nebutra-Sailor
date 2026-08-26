import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BLOG_POST_PAGE = join(process.cwd(), "src/app/[lang]/(marketing)/blog/[slug]/page.tsx");

describe("blog post prerender clock", () => {
  it("does not read the current time while prerendering /[lang]/blog/[slug]", () => {
    const source = readFileSync(BLOG_POST_PAGE, "utf8");

    expect(source).not.toMatch(/Date\.now\s*\(/u);
    expect(source).not.toMatch(/new Date\(\s*\)/u);
    expect(source).toContain("contentTimestamp");
  });
});
