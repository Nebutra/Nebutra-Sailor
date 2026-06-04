import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultDeployTargets } from "../../../preset/src/deploy-target";
import {
  appendDeployTargetEnv,
  resolveScaffoldDeployTargets,
  type ScaffoldDeployTarget,
} from "./deploy";

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
