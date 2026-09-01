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
 * Contract lock for carina.nebutra.com — product docs on Fly (static nginx
 * Machine in sin). ECS rsync stays rollback-only.
 */
describe("carina domain closure", () => {
  it("brand SSOT carries carina.nebutra.com", () => {
    expect(DEFAULT_BRAND.domains.carina).toBe("carina.nebutra.com");
    expect(brand.domains.carina).toBe("carina.nebutra.com");
    expect(getBrandOrigin("carina")).toBe("https://carina.nebutra.com");
    expect(getBrandPublicUrls().carinaUrl).toBe("https://carina.nebutra.com");
  });

  it("topology does not list carina as an ECS surface", () => {
    const raw = readFileSync("infra/ops/dns/topology.defaults.yaml", "utf-8");
    const ecsLine = raw.split("\n").find((l) => l.startsWith("ecs_surfaces:"));
    expect(ecsLine ?? "").not.toMatch(/carina/);
    expect(raw).toMatch(/^\s*carina,/m);
    const vercelLine = raw.split("\n").find((l) => l.startsWith("vercel_surfaces:"));
    expect(vercelLine ?? "").not.toMatch(/carina/);
  });

  it("DOMAINS.md documents Fly and no parallel origin", () => {
    const domains = readFileSync("docs/DOMAINS.md", "utf-8");
    expect(domains).toContain("carina.nebutra.com");
    expect(domains).toContain("deploy-carina-fly");
    expect(domains).toMatch(/api\.carina\.\*/);
    expect(domains).toContain("Nebutra/carina");
    expect(domains).toMatch(/Fly|fly\.dev/i);
  });

  it("Fly nginx + deploy workflow exist; ECS files stay as rollback", () => {
    const flyConf = join(process.cwd(), "infra/fly/carina.nginx.conf");
    const flyToml = join(process.cwd(), "infra/fly/carina.toml");
    const flyWf = join(process.cwd(), ".github/workflows/deploy-carina-fly.yml");
    const ecsConf = join(process.cwd(), "infra/runtime/nginx/conf.d/carina.nebutra.com.conf");
    const ecsScript = join(process.cwd(), "infra/ops/scripts/deploy-carina-docs-ecs.sh");
    const ecsWf = join(process.cwd(), ".github/workflows/deploy-carina-ecs.yml");

    expect(existsSync(flyConf), flyConf).toBe(true);
    expect(existsSync(flyToml), flyToml).toBe(true);
    expect(existsSync(flyWf), flyWf).toBe(true);
    expect(existsSync(ecsConf), ecsConf).toBe(true);
    expect(existsSync(ecsScript), ecsScript).toBe(true);
    expect(existsSync(ecsWf), ecsWf).toBe(true);

    const flyBody = readFileSync(flyConf, "utf-8");
    expect(flyBody).toContain("listen 8080");
    expect(flyBody).not.toMatch(/return 301 https:\/\/nebutra\.com/);

    const toml = readFileSync(flyToml, "utf-8");
    expect(toml).toContain('app = "nebutra-carina"');
    expect(toml).toContain('primary_region = "sin"');

    const deploy = readFileSync(flyWf, "utf-8");
    expect(deploy).toContain("Nebutra/carina");
    expect(deploy).toContain("nebutra-carina");
    expect(deploy).toContain("FLY_API_TOKEN");

    const ecsDeploy = readFileSync(ecsWf, "utf-8");
    expect(ecsDeploy).toContain("rollback-carina-ecs");
  });
});
