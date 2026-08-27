import { DEMAND_ROOTS } from "@nebutra/forge-runtime";
import { describe, expect, it } from "vitest";
import { buildForgeSitemapEntries, listPublicToolPaths } from "./sitemap-entries";

describe("listPublicToolPaths", () => {
  it("includes host-registered tools from the live registry", () => {
    const paths = listPublicToolPaths();
    expect(paths).toContain("/t/base64");
    expect(paths).toContain("/t/md-to-pdf");
    expect(paths.every((path) => path.startsWith("/t/"))).toBe(true);
  });

  it("still lists F0 tools when the host registry cannot boot", () => {
    const paths = listPublicToolPaths(() => {
      throw new Error("playwright missing");
    });
    expect(paths).toContain("/t/base64");
    expect(paths).toContain("/t/md-to-pdf");
  });
});

describe("buildForgeSitemapEntries", () => {
  it("advertises home, docs, demand roots, and tools without lastmod", () => {
    const entries = buildForgeSitemapEntries("https://forge.example.test");
    const urls = entries.map((entry) => entry.url);

    expect(urls[0]).toBe("https://forge.example.test/");
    expect(urls).toContain("https://forge.example.test/docs");
    expect(urls).toContain("https://forge.example.test/llms.txt");
    for (const root of DEMAND_ROOTS) {
      expect(urls).toContain(`https://forge.example.test/r/${root}`);
    }
    expect(urls).toContain("https://forge.example.test/t/base64");
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
    expect(JSON.stringify(entries)).not.toMatch(/new Date/);
  });
});
