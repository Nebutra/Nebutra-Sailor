import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "../../../packages/design/brand/src/metadata";

/**
 * kcq.nebutra.com is one origin split per path (docs/architecture/2026-10-09-kcq-product-surface.md):
 * prerendered public pages are indexed, `/` enters the `/app` workbench, everything else is
 * disallowed and unknown paths are real 404s. The route table is apps/kcq/src/public/routes.ts
 * (apps/kcq's own tests check robots/sitemap against it); this file pins the deploy-facing
 * contract independently of that code.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ORIGIN = "https://kcq.nebutra.com";
const PUBLIC_PATHS = [
  "/home",
  "/zh/home",
  "/benchmark",
  "/zh/benchmark",
  "/investors",
  "/zh/investors",
];
const HREFLANGS = ["en", "zh-Hans", "x-default"];
/** Documentation roots (apps/kcq-docs), served by the same nginx. */
const DOCS_ROOTS = ["/docs", "/zh/docs"];

describe("kcq public surface", () => {
  it("brand.domains carries the kcq host", () => {
    expect(`https://${brand.domains.kcq}`).toBe(ORIGIN);
  });

  it("robots.txt allows exactly the public pages and disallows the rest", () => {
    const robots = read("apps/kcq/public/robots.txt");
    const group = robots.slice(robots.indexOf("User-agent: *"));
    const allowed = [...group.matchAll(/^Allow:\s*(\S+)$/gm)].map((m) => m[1]);

    expect(group).toMatch(/^Disallow:\s*\/\s*$/m);
    // `$` anchors each page; /assets/ lets crawlers render the prerendered pages; /llms.txt is the
    // same pages as plain text for agents (apps/kcq/src/public/llms.ts). The docs (apps/kcq-docs)
    // are allowed by prefix and list their own pages in /docs/sitemap.xml.
    expect(allowed.sort()).toEqual(
      [...PUBLIC_PATHS.map((path) => `${path}$`), "/assets/", "/llms.txt$", ...DOCS_ROOTS].sort(),
    );
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(robots).toContain(`Sitemap: ${ORIGIN}/docs/sitemap.xml`);
  });

  it("sitemap.xml lists each public page with reciprocal hreflang alternates", () => {
    const sitemap = read("apps/kcq/public/sitemap.xml");
    const urls = sitemap.split("<url>").slice(1);

    expect(urls.map((block) => /<loc>([^<]+)<\/loc>/.exec(block)?.[1])).toEqual(
      PUBLIC_PATHS.map((path) => ORIGIN + path),
    );
    for (const block of urls) {
      const hreflangs = [...block.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)"/g)];
      expect(hreflangs.map((m) => m[1])).toEqual(HREFLANGS);
    }
  });

  it("nginx serves prerendered pages and never answers an unknown path with the app", () => {
    const nginx = read("infra/fly/kcq.nginx.conf");

    expect(nginx).toContain("location ~ ^/(zh/)?(home|benchmark|investors)$");
    expect(nginx).toMatch(/location = \/ \{\s*return 302 \/app\$is_args\$args;/);
    // A bare SPA fallback turns every typo, probe and stale .map/.xml/.webmanifest URL
    // into a 200 soft 404; the shell is only for app paths.
    const fallbacks = [...nginx.matchAll(/try_files[^;]*\/index\.html[^;]*;/g)].map((m) => m[0]);
    expect(fallbacks.length).toBeGreaterThan(0);
    for (const directive of fallbacks) expect(directive).toBe("try_files /index.html =404;");
    expect(/location \/ \{([^}]*)\}/.exec(nginx)?.[1]).toContain("try_files $uri =404;");
  });

  it("nginx serves the docs as extensionless pages with their own 404s", () => {
    const nginx = read("infra/fly/kcq.nginx.conf");
    expect(nginx).toMatch(
      /location ~ \^\/\(zh\/\)\?docs\(\/\[\^\.\]\*\)\?\$ \{\s*try_files \$uri\.html =404;/,
    );
    expect(nginx).toContain("~^/docs(/|$) /docs/404.html;");
    expect(nginx).toContain("~^/zh/docs(/|$) /zh/docs/404.html;");
  });

  it("one deploy ships the product and its docs", () => {
    const workflow = read(".github/workflows/deploy-kcq-fly.yml");
    expect(workflow).toContain("apps/kcq-docs/dist/.");
    expect(workflow).toContain("https://nebutra-kcq.fly.dev/docs");
  });

  it("deploy smokes probe the app and a public page, not the `/` redirect", () => {
    const workflow = read(".github/workflows/deploy-kcq-fly.yml");
    expect(workflow).toContain("https://nebutra-kcq.fly.dev/app");
    expect(workflow).toContain("https://nebutra-kcq.fly.dev/home");
    expect(workflow).not.toMatch(/https:\/\/(?:nebutra-kcq\.fly\.dev|kcq\.nebutra\.com)\/ /);
  });
});

/**
 * @nebutra/auth deliberately does not depend on @nebutra/brand (see providers/better-auth.ts),
 * so its first-party origin lists stay literals; apps/auth's Worker derives the same list from
 * brand.domains. Pin the literals to brand so a moved product host cannot leave them behind.
 */
describe("kcq session trust follows brand.domains", () => {
  it("the auth package trusts the kcq origin", () => {
    expect(read("packages/iam/auth/src/providers/better-auth/trusted-origins.ts")).toContain(
      `"https://${brand.domains.kcq}"`,
    );
    expect(read("packages/iam/auth/src/utils/auth-center.ts")).toContain(
      `hosts.add("${brand.domains.kcq}")`,
    );
  });

  it("the auth Worker derives the kcq origin from brand.domains", () => {
    const worker = read("apps/auth/src/worker-edge.ts");
    expect(worker).toMatch(/https:\/\/\$\{brand\.domains\.kcq\}/);
    expect(worker).not.toMatch(/https:\/\/kcq\./);
  });

  it("sign-in may return to the kcq host", () => {
    for (const config of ["apps/auth/wrangler.edge.jsonc", "apps/auth/wrangler.jsonc"]) {
      const line = read(config)
        .split("\n")
        .find((l) => l.includes("AUTH_RETURN_ALLOWED_HOSTS"));
      expect(line, config).toContain(brand.domains.kcq);
    }
  });
});
