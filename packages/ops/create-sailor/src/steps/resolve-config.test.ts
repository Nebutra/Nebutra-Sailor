import { describe, expect, it } from "vitest";
import { resolveConfig } from "./resolve-config";

describe("resolveConfig deploy target closure", () => {
  it("stores provider-switchable deployTargets alongside the legacy deployTarget", async () => {
    const resolved = await resolveConfig({ yes: true, deploy: "cloudflare" }, true);

    expect(resolved.deployTarget).toBe("cloudflare");
    expect(resolved.config.deployTargets).toMatchObject({
      web: "cloudflare-pages",
      "landing-page": "cloudflare-pages",
      gateway: "cloudflare-workers",
      "python-ai": "ecs-docker",
    });
  });
});
