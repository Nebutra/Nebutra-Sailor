import { describe, expect, it } from "vitest";
import {
  DEPLOYABLE_SERVICES,
  deployTargetEnvKey,
  getDefaultDeployTargets,
  resolveDeployTarget,
  resolveDeployTargets,
  TARGETS_BY_SURFACE,
} from "../deploy-target";

describe("deploy-target selector", () => {
  it("defaults the production MVP topology to Vercel, Cloudflare Workers, and ECS origin", () => {
    expect(resolveDeployTarget("web", {})).toBe("vercel");
    expect(resolveDeployTarget("landing-page", {})).toBe("vercel");
    expect(resolveDeployTarget("gateway", {})).toBe("cloudflare-workers");
    expect(resolveDeployTarget("python-ai", {})).toBe("ecs-docker");
  });

  it("keeps packages out of the deployment surface", () => {
    expect(() => resolveDeployTarget("@nebutra/db", {})).toThrow(/Unknown deploy service/);
    expect(() => resolveDeployTarget("packages/platform/db", {})).toThrow(/Unknown deploy service/);
  });

  it("honors explicit overrides only when allowed for the service surface", () => {
    expect(resolveDeployTarget("web", { DEPLOY_TARGET_WEB: "standalone" })).toBe("standalone");
    expect(resolveDeployTarget("web", { DEPLOY_TARGET_WEB: "cloudflare-pages" })).toBe(
      "cloudflare-pages",
    );
    expect(resolveDeployTarget("web", { DEPLOY_TARGET_WEB: "railway" })).toBe("railway");
    expect(resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "ecs-docker" })).toBe(
      "ecs-docker",
    );
    expect(resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "railway" })).toBe("railway");
    expect(resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "k8s" })).toBe("k8s");
    expect(resolveDeployTarget("python-ai", { DEPLOY_TARGET_PYTHON_AI: "k8s" })).toBe("k8s");
    expect(resolveDeployTarget("python-ai", { DEPLOY_TARGET_PYTHON_AI: "railway" })).toBe(
      "railway",
    );

    expect(() => resolveDeployTarget("web", { DEPLOY_TARGET_WEB: "k8s" })).toThrow(/not allowed/);
    expect(() =>
      resolveDeployTarget("python-ai", { DEPLOY_TARGET_PYTHON_AI: "cloudflare-workers" }),
    ).toThrow(/not allowed/);
  });

  it("exposes canonical service, target, and env-key contracts", () => {
    expect(DEPLOYABLE_SERVICES).toEqual([
      "web",
      "landing-page",
      "design-docs",
      "sailor-docs",
      "gateway",
      "python-ai",
    ]);
    expect(TARGETS_BY_SURFACE.frontend).toEqual([
      "vercel",
      "standalone",
      "cloudflare-pages",
      "railway",
    ]);
    expect(TARGETS_BY_SURFACE.edgeGateway).toEqual([
      "cloudflare-workers",
      "vercel-functions",
      "ecs-docker",
      "k8s",
      "aws",
      "railway",
    ]);
    expect(TARGETS_BY_SURFACE.originBackend).toEqual(["ecs-docker", "k8s", "aws", "railway"]);
    expect(deployTargetEnvKey("landing-page")).toBe("DEPLOY_TARGET_LANDING_PAGE");
    expect(deployTargetEnvKey("python-ai")).toBe("DEPLOY_TARGET_PYTHON_AI");
  });

  it("resolves a complete target map for every deployable service", () => {
    expect(resolveDeployTargets({})).toEqual(getDefaultDeployTargets());
    expect(resolveDeployTargets({ DEPLOY_TARGET_WEB: "standalone" })).toMatchObject({
      web: "standalone",
      gateway: "cloudflare-workers",
      "python-ai": "ecs-docker",
    });
  });
});
