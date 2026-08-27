import { describe, expect, it } from "vitest";
import { resolveConfig } from "./resolve-config";

describe("resolveConfig deploy target closure", () => {
  it("stores provider-switchable deployTargets alongside the legacy deployTarget", async () => {
    const resolved = await resolveConfig({ yes: true, deploy: "cloudflare" }, true);

    expect(resolved.deployTarget).toBe("cloudflare");
    expect(resolved.config.deployTargets).toMatchObject({
      web: "cloudflare-pages",
      landing: "cloudflare-pages",
      gateway: "cloudflare-workers",
      "python-ai": "ecs-docker",
    });
  });

  it("records PlanetScale as a Postgres database host selection", async () => {
    const resolved = await resolveConfig({ yes: true, db: "mysql", dbHost: "planetscale" }, true);

    expect(resolved.database).toBe("postgresql");
    expect(resolved.databaseHost).toBe("planetscale");
    expect(resolved.config.database).toBe("postgresql");
    expect(resolved.config.databaseHost).toBe("planetscale");
  });
});
