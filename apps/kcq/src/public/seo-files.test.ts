import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderRobotsTxt, renderSitemapXml } from "./seo-files";

const read = (file: string) => readFileSync(new URL(`../../public/${file}`, import.meta.url), "utf8");

describe("static SEO files", () => {
  it("public/robots.txt matches the route table", () => {
    expect(read("robots.txt")).toBe(renderRobotsTxt());
  });

  it("public/sitemap.xml matches the route table", () => {
    const sitemap = read("sitemap.xml");
    expect(sitemap).toBe(renderSitemapXml());
    expect(sitemap.match(/<url>/g)).toHaveLength(6);
    expect(sitemap.match(/<xhtml:link /g)).toHaveLength(18);
    expect(sitemap).not.toContain("<lastmod>");
  });
});
