import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultDeployTargets } from "../../../preset/src/deploy-target";
import {
  appendDeployTargetEnv,
  applyDeployTarget,
  resolveScaffoldDeployTargets,
  type ScaffoldDeployTarget,
} from "./deploy";

const TEMPLATE_ROOT = path.resolve(import.meta.dirname, "..", "..", "templates");

describe("resolveScaffoldDeployTargets", () => {
  it("maps the default legacy deploy target to the provider-switchable runtime defaults", () => {
    expect(resolveScaffoldDeployTargets("vercel")).toEqual(getDefaultDeployTargets());
  });

  it.each<[ScaffoldDeployTarget, Record<string, string>]>([
    [
      "cloudflare",
      {
        web: "cloudflare-pages",
        "landing-page": "cloudflare-pages",
        "design-docs": "cloudflare-pages",
        "sailor-docs": "cloudflare-pages",
        gateway: "cloudflare-workers",
        "python-ai": "ecs-docker",
      },
    ],
    [
      "selfhost",
      {
        web: "standalone",
        "landing-page": "standalone",
        "design-docs": "standalone",
        "sailor-docs": "standalone",
        gateway: "ecs-docker",
        "python-ai": "ecs-docker",
      },
    ],
    [
      "railway",
      {
        web: "railway",
        "landing-page": "railway",
        "design-docs": "railway",
        "sailor-docs": "railway",
        gateway: "railway",
        "python-ai": "railway",
      },
    ],
  ])("maps --deploy=%s into per-service targets", (target, expected) => {
    expect(resolveScaffoldDeployTargets(target)).toEqual(expected);
  });
});

describe("appendDeployTargetEnv", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("adds per-service DEPLOY_TARGET defaults to .env.example idempotently", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-target-env-"));
    fs.writeFileSync(path.join(dir, ".env.example"), 'DATABASE_URL="postgresql://..."\n');

    const targets = resolveScaffoldDeployTargets("cloudflare");
    await appendDeployTargetEnv(dir, targets);
    await appendDeployTargetEnv(dir, targets);

    const env = fs.readFileSync(path.join(dir, ".env.example"), "utf8");
    expect(env.match(/Deployment Targets/g)).toHaveLength(1);
    expect(env).toContain('DEPLOY_TARGET_WEB="cloudflare-pages"');
    expect(env).toContain('DEPLOY_TARGET_GATEWAY="cloudflare-workers"');
    expect(env).toContain('DEPLOY_TARGET_PYTHON_AI="ecs-docker"');
  });
});

describe("applyDeployTarget", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it.each([
    "vercel",
    "cloudflare",
  ] as const)("writes a gateway Workers manifest for --deploy=%s because gateway defaults to cloudflare-workers", async (target) => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-target-"));
    fs.mkdirSync(path.join(dir, "backends", "gateway"), { recursive: true });

    await applyDeployTarget(dir, target);

    const gatewayWrangler = fs.readFileSync(
      path.join(dir, "backends", "gateway", "wrangler.toml"),
      "utf8",
    );
    expect(gatewayWrangler).toContain('main = "src/worker.ts"');
    expect(gatewayWrangler).toContain('compatibility_flags = ["nodejs_compat"]');
    expect(gatewayWrangler).toContain("[observability]");
    expect(gatewayWrangler).toContain("head_sampling_rate = 1");
  });
});

describe("gateway template runtime entries", () => {
  it("scaffolds Worker and Node entries without making the Hono app Node-only", () => {
    const gatewayRoot = path.join(TEMPLATE_ROOT, "backends", "gateway");
    const index = fs.readFileSync(path.join(gatewayRoot, "src", "index.ts"), "utf8");
    expect(index).not.toContain("@hono/node-server");
    expect(index).toContain("export default app");

    const worker = fs.readFileSync(path.join(gatewayRoot, "src", "worker.ts"), "utf8");
    expect(worker).not.toContain("@hono/node-server");
    expect(worker).toContain("fetch(request");

    const node = fs.readFileSync(path.join(gatewayRoot, "src", "node.ts"), "utf8");
    expect(node).toContain("@hono/node-server");

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(gatewayRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.dev).toContain("src/node.ts");
    expect(packageJson.scripts.start).toContain("dist/node.js");
  });
});
