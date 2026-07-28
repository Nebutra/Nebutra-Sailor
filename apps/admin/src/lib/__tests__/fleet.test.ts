import { createRequire } from "node:module";
import path from "node:path";
import { brand } from "@nebutra/brand";
import { DEPLOYABLE_SERVICES } from "@nebutra/preset/deploy-target";
import { describe, expect, it } from "vitest";
import { buildFleet, FLEET, unclaimedHosts } from "../fleet";

const require_ = createRequire(import.meta.url);
const ecosystem = require_(
  path.join(process.cwd(), "../../infra/iac/ecs/ecosystem.config.cjs"),
) as {
  apps: Array<{ name: string; env: { PORT: number } }>;
};

describe("fleet inventory", () => {
  it("mirrors every PM2 process name and port from the ECS ecosystem config", () => {
    // Drift guard: the inventory is hand-maintained because the PM2 config is
    // rendered on the VM (envsubst) and cannot be imported at runtime. If the
    // two disagree, the Fleet panel is lying about the ecosystem.
    for (const app of ecosystem.apps) {
      const service = FLEET.find((s) => s.pm2Name === app.name);
      expect(service, `PM2 process '${app.name}' is missing from FLEET`).toBeDefined();
      expect(service?.port, `port drift for '${app.name}'`).toBe(app.env.PORT);
    }
  });

  it("declares no PM2 process that the ECS config does not run", () => {
    const pm2Names = new Set(ecosystem.apps.map((app) => app.name));
    for (const service of FLEET) {
      if (!service.pm2Name) continue;
      expect(pm2Names.has(service.pm2Name), `unknown PM2 process '${service.pm2Name}'`).toBe(true);
    }
  });

  it("references only registered deployable services and real domain keys", () => {
    for (const service of FLEET) {
      if (service.deployService) {
        expect(DEPLOYABLE_SERVICES as readonly string[]).toContain(service.deployService);
      }
      if (service.domainKey) {
        expect(brand.domains[service.domainKey]).toBeTruthy();
      }
    }
  });

  it("includes the control plane itself with its own host and port", () => {
    const admin = FLEET.find((s) => s.id === "@nebutra/admin");
    expect(admin).toMatchObject({ pm2Name: "admin", port: 3108, deployService: "admin" });
    expect(brand.domains.admin).toBe("admin.nebutra.com");
  });

  it("resolves hosts and flags target/runtime disagreement", () => {
    const rows = buildFleet({});
    const web = rows.find((r) => r.id === "@nebutra/web");
    // web defaults to the Vercel target while production traffic is still ECS —
    // exactly the drift the panel is meant to surface, not hide.
    expect(web?.host).toBe("app.nebutra.com");
    expect(web?.deployTarget).toBe("vercel");
    expect(web?.targetMatchesRuntime).toBe(false);

    const withOverride = buildFleet({ DEPLOY_TARGET_WEB: "standalone" });
    expect(withOverride.find((r) => r.id === "@nebutra/web")?.targetMatchesRuntime).toBe(true);

    // The IdP is not target-switchable, so there is nothing to compare.
    const idp = rows.find((r) => r.id === "@nebutra/idp");
    expect(idp?.deployTarget).toBeNull();
    expect(idp?.targetMatchesRuntime).toBeNull();
  });

  it("reports hosts in the domain SSOT that no service claims", () => {
    const unclaimed = unclaimedHosts();
    // cdn / status / analytics / pebble are infrastructure or external fronts,
    // not apps in this repo — they are expected to be unclaimed.
    expect(unclaimed).toContain(brand.domains.cdn);
    expect(unclaimed).not.toContain(brand.domains.admin);
  });
});
