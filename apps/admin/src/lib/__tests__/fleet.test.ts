import { createRequire } from "node:module";
import path from "node:path";
import { brand, getBrandOrigin } from "@nebutra/brand";
import { DEPLOYABLE_SERVICES } from "@nebutra/preset/deploy-target";
import { describe, expect, it } from "vitest";
import { buildFleet, FLEET, unclaimedHosts } from "../fleet";
import { healthUrl } from "../probe";

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

  it("gives every row exactly one address shape — a host or a path, never both", () => {
    // The docs bundle is the reason this distinction exists: it is reached at
    // `<site>/docs` through the landing proxy and has no host of its own. A
    // domainKey on that row would be the docs subdomain coming back.
    for (const service of FLEET) {
      const hasHost = Boolean(service.domainKey);
      const hasPath = Boolean(service.baseUrl);
      expect(hasHost && hasPath, `${service.id} declares both a host and a base URL`).toBe(false);
      if (service.health) {
        expect(hasHost || hasPath, `${service.id} is probed but has no address`).toBe(true);
      }
    }

    // buildFleet(), not FLEET: healthUrl takes a resolved row, and under
    // exactOptionalPropertyTypes the definition is not assignable to it.
    const docs = buildFleet().find((s) => s.id === "@nebutra/sailor-docs");
    if (!docs) throw new Error("the docs bundle left the fleet");
    expect(docs.domainKey).toBeUndefined();
    expect(docs.baseUrl).toBe(`${getBrandOrigin("landing")}/docs`);
    expect(healthUrl(docs)).toBe(`${getBrandOrigin("landing")}/docs${docs.health}`);
  });

  it("includes the control plane itself with its own host and port", () => {
    const admin = FLEET.find((s) => s.id === "@nebutra/admin");
    expect(admin).toMatchObject({ pm2Name: "admin", port: 3108, deployService: "admin" });
    expect(brand.domains.admin).toBe("admin.nebutra.com");
  });

  it("resolves hosts and flags target/runtime disagreement", () => {
    const rows = buildFleet({});
    const web = rows.find((r) => r.id === "@nebutra/web");
    // web's default target is the Fly Machine it actually runs on.
    expect(web?.host).toBe("app.nebutra.com");
    expect(web?.deployTarget).toBe("fly");
    expect(web?.targetMatchesRuntime).toBe(true);

    // A standalone override disagrees with the Fly Machine — exactly the drift
    // the panel is meant to surface, not hide.
    const withOverride = buildFleet({ DEPLOY_TARGET_WEB: "standalone" });
    expect(withOverride.find((r) => r.id === "@nebutra/web")?.targetMatchesRuntime).toBe(false);

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
