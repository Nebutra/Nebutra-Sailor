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

  it("lets Clerk treat localized public information pages as anonymous routes", () => {
    const proxy = readFromRepo("apps/web/src/proxy.ts");

    // Cookie-based i18n: isPublicPathname compares raw pathname directly (no stripLocalePrefix).
    expect(proxy).toContain("function isPublicPathname");
    expect(proxy).toContain('pathname === "/"');
    expect(proxy).toContain('"/demo"');
    expect(proxy).toContain("if (!isPublicPathname(innerReq.nextUrl.pathname))");
    expect(proxy).toContain("txt|xml");
  });

  it("indexes public web pages while keeping private app surfaces out of search", () => {
    const rootLayout = readFromRepo("apps/web/src/app/layout.tsx");
    const privateLayout = readFromRepo("apps/web/src/app/(app)/layout.tsx");
    const robots = readFromRepo("apps/web/src/app/robots.ts");

    expect(rootLayout).not.toContain("index: false");
    expect(rootLayout).not.toContain("follow: false");
    expect(privateLayout).toContain("index: false");
    expect(privateLayout).toContain("follow: false");
    // Cookie-based i18n: no /en or /zh prefixed paths in robots.txt.
    expect(robots).toContain('allow: ["/", "/demo"]');
    expect(robots).toContain('"/workspace"');
    expect(robots).not.toContain('disallow: "/"');
    expect(existsSync(repoPath("apps/web/src/app/sitemap.ts"))).toBe(true);
  });
});
