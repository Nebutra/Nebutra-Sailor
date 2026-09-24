import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string) {
  return path.join(path.resolve(process.cwd(), "..", ".."), relativePath);
}

function readFromRepo(relativePath: string) {
  return readFileSync(repoPath(relativePath), "utf8");
}

describe("public dashboard SEO and access boundaries", () => {
  it("serves the localized root from a public page instead of the authenticated app shell", () => {
    expect(existsSync(repoPath("apps/web/src/app/(public)/page.tsx"))).toBe(true);
    expect(existsSync(repoPath("apps/web/src/app/(app)/workspace/page.tsx"))).toBe(true);
    expect(existsSync(repoPath("apps/web/src/app/(app)/page.tsx"))).toBe(false);

    const privateLayout = readFromRepo("apps/web/src/app/(app)/layout.tsx");
    expect(privateLayout).toContain("await requireAuth()");
  });

  it("keeps the whole dashboard origin out of search from a single robots source", () => {
    const rootLayout = readFromRepo("apps/web/src/app/layout.tsx");
    const privateLayout = readFromRepo("apps/web/src/app/(app)/layout.tsx");

    expect(privateLayout).toContain("index: false");
    expect(privateLayout).toContain("follow: false");
    // The root layout stays neutral — the origin-wide answer lives in robots.txt.
    expect(rootLayout).not.toContain("index: false");

    // app.nebutra.com is private: static robots.txt is the ONE robots answer,
    // and it disallows everything. The app-router robots.ts/sitemap.ts used to
    // ship the opposite directive (allow: ["/", "/demo"]) from the same origin,
    // so they must stay deleted — any indexable surface belongs to the landing
    // origin, which owns the SEO route registry and the sharded sitemap.
    const robotsTxt = readFromRepo("apps/web/public/robots.txt");
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Disallow: /");
    expect(robotsTxt).not.toContain("Allow:");
    expect(robotsTxt).not.toContain("Sitemap:");

    expect(existsSync(repoPath("apps/web/src/app/robots.ts"))).toBe(false);
    expect(existsSync(repoPath("apps/web/src/app/sitemap.ts"))).toBe(false);
  });
});
