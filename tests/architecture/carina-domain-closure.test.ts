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
 * Contract lock for carina.nebutra.com — product docs on ECS (A record),
 * nginx static root. Owner topology 2026-07-30 (same pattern as pebble).
 */
describe("carina domain closure", () => {
  it("brand SSOT carries carina.nebutra.com", () => {
    expect(DEFAULT_BRAND.domains.carina).toBe("carina.nebutra.com");
    expect(brand.domains.carina).toBe("carina.nebutra.com");
    expect(getBrandOrigin("carina")).toBe("https://carina.nebutra.com");
    expect(getBrandPublicUrls().carinaUrl).toBe("https://carina.nebutra.com");
  });

  it("topology lists carina as an ECS surface (not Vercel)", () => {
    const raw = readFileSync("infra/ops/dns/topology.defaults.yaml", "utf-8");
    expect(raw).toMatch(/ecs_surfaces:.*\[.*carina/);
    expect(raw).toMatch(/^\s*carina,/m);
    // vercel_surfaces must not claim carina
    const vercelLine = raw.split("\n").find((l) => l.startsWith("vercel_surfaces:"));
    expect(vercelLine ?? "").not.toMatch(/carina/);
  });

  it("DOMAINS.md documents ECS A topology and no parallel origin", () => {
    const domains = readFileSync("docs/DOMAINS.md", "utf-8");
    expect(domains).toContain("carina.nebutra.com");
    expect(domains).toContain("106.15.4.31");
    expect(domains).toContain("deploy-carina-ecs");
    expect(domains).toMatch(/api\.carina\.\*/);
    expect(domains).toContain("Nebutra/carina");
    expect(domains).toMatch(/A.*carina|carina.*ECS/i);
  });

  it("nginx vhost + deploy script + workflow exist", () => {
    const conf = join(process.cwd(), "infra/runtime/nginx/conf.d/carina.nebutra.com.conf");
    const script = join(process.cwd(), "infra/ops/scripts/deploy-carina-docs-ecs.sh");
    const deployWf = join(process.cwd(), ".github/workflows/deploy-carina-ecs.yml");
    const mainNginx = join(process.cwd(), "infra/runtime/nginx/nginx-ecs-current.conf");

    expect(existsSync(conf), conf).toBe(true);
    expect(existsSync(script), script).toBe(true);
    expect(existsSync(deployWf), deployWf).toBe(true);

    const confBody = readFileSync(conf, "utf-8");
    expect(confBody).toContain("server_name carina.nebutra.com");
    expect(confBody).toContain("/var/www/nebutra/carina/current");
    expect(confBody).not.toMatch(/return 301 https:\/\/nebutra\.com/);

    const main = readFileSync(mainNginx, "utf-8");
    expect(main).toContain("carina.nebutra.com.conf");

    const deploy = readFileSync(deployWf, "utf-8");
    expect(deploy).toContain("Nebutra/carina");
    expect(deploy).toContain("deploy-carina-docs-ecs.sh");
    expect(deploy).toContain("ECS_SSH_PRIVATE_KEY");
  });
});
