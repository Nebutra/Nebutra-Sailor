import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "../../packages/design/brand/src/metadata";
import {
  getBrandOrigin,
  getBrandPublicUrls,
} from "../../packages/design/brand/src/metadata-helpers";
import { DEFAULT_BRAND } from "../../scripts/brand-types";

/**
 * open.nebutra.com is a landing host alias + an app settings hub.
 * Closure phase: do not invent apps/open or a new package.
 */
describe("open platform closure", () => {
  it("registers open.nebutra.com on the brand SSOT", () => {
    expect(DEFAULT_BRAND.domains.open).toBe("open.nebutra.com");
    expect(brand.domains.open).toBe("open.nebutra.com");
    expect(getBrandOrigin("open")).toBe("https://open.nebutra.com");
    expect(getBrandPublicUrls().openUrl).toBe("https://open.nebutra.com");
  });

  it("does not invent a workspace app or package for the host", () => {
    expect(existsSync(join(process.cwd(), "apps/open/package.json"))).toBe(false);
    expect(existsSync(join(process.cwd(), "packages/open"))).toBe(false);
  });

  it("keeps the public catalog on landing and the console on web settings", () => {
    expect(
      existsSync(join(process.cwd(), "apps/landing/src/app/[lang]/(marketing)/open/page.tsx")),
    ).toBe(true);
    expect(
      existsSync(join(process.cwd(), "apps/web/src/app/(app)/settings/developers/page.tsx")),
    ).toBe(true);
  });

  it("ships the Vercel CNAME + domain-attach runbook", () => {
    expect(existsSync(join(process.cwd(), "infra/ops/scripts/point-open-dns-vercel.sh"))).toBe(
      true,
    );
    expect(existsSync(join(process.cwd(), ".github/workflows/point-open-dns.yml"))).toBe(true);
  });

  it("is a Vercel landing alias, not an ECS surface", () => {
    const raw = readFileSync("infra/ops/dns/topology.defaults.yaml", "utf-8");
    expect(raw).toMatch(/vercel_surfaces:.*\bopen\b/);
    const ecsLine = raw.split("\n").find((line) => line.startsWith("ecs_surfaces:"));
    expect(ecsLine ?? "").not.toMatch(/\bopen\b/);
  });

  it("documents the host as a landing alias with the console on app", () => {
    const domains = readFileSync("docs/DOMAINS.md", "utf-8");
    expect(domains).toContain("open.nebutra.com");
    expect(domains).toContain("/open");
    expect(domains).toContain("/settings/developers");
    expect(domains).toMatch(/Do not add `apps\/open`/);
  });
});
