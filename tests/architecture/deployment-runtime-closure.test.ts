import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEPLOYABLE_SERVICES,
  deployTargetEnvKey,
  getDefaultDeployTargets,
  resolveDeployTarget,
  TARGETS_BY_SURFACE,
} from "../../packages/ops/preset/src/deploy-target";

const ROOT = process.cwd();
const ADR_PATH = resolve(ROOT, "docs/architecture/2026-06-04-production-runtime-closure.md");

describe("production runtime closure", () => {
  it("defaults to the recommended Worker Gateway + ECS Origin topology without locking providers", () => {
    expect(getDefaultDeployTargets()).toMatchObject({
      web: "vercel",
      "landing-page": "vercel",
      gateway: "cloudflare-workers",
      "python-ai": "ecs-docker",
    });

    expect(TARGETS_BY_SURFACE.edgeGateway).toEqual(
      expect.arrayContaining([
        "cloudflare-workers",
        "vercel-functions",
        "ecs-docker",
        "k8s",
        "aws",
        "railway",
      ]),
    );
    expect(TARGETS_BY_SURFACE.frontend).toEqual(
      expect.arrayContaining(["vercel", "standalone", "cloudflare-pages", "railway"]),
    );
    expect(TARGETS_BY_SURFACE.originBackend).toEqual(["ecs-docker", "k8s", "aws", "railway"]);
  });

  it("keeps deploy targets scoped to apps and deployable backends, not domain packages", () => {
    expect(DEPLOYABLE_SERVICES).not.toContain("@nebutra/db");
    expect(DEPLOYABLE_SERVICES).not.toContain("packages/platform/db");
    expect(() => resolveDeployTarget("@nebutra/cache", {})).toThrow(/Unknown deploy service/);
  });

  it("uses per-service selector keys so one service can switch providers without moving the whole stack", () => {
    expect(deployTargetEnvKey("gateway")).toBe("DEPLOY_TARGET_GATEWAY");
    expect(deployTargetEnvKey("python-ai")).toBe("DEPLOY_TARGET_PYTHON_AI");
    expect(resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "k8s" })).toBe("k8s");
    expect(resolveDeployTarget("python-ai", { DEPLOY_TARGET_PYTHON_AI: "aws" })).toBe("aws");
  });

  it("records the deployment closure ADR with defaults, switchability, and non-deploying packages", () => {
    expect(existsSync(ADR_PATH), `${ADR_PATH} must exist`).toBe(true);
    const adr = readFileSync(ADR_PATH, "utf8");

    expect(adr).toContain("Cloudflare Workers");
    expect(adr).toContain("ECS Origin");
    expect(adr).toContain("provider-switchable");
    expect(adr).toContain("DEPLOY_TARGET_GATEWAY");
    expect(adr).toContain("packages do not deploy");
  });
});
