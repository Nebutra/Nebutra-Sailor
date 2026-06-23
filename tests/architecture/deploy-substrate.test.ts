import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Legacy deploy-workflow governance.
 *
 * The target contract now lives in `@nebutra/preset/deploy-target` and
 * `docs/architecture/2026-06-04-production-runtime-closure.md`: gateway defaults
 * to Cloudflare Workers but remains provider-switchable. This file only guards
 * the legacy Kubernetes auto-trigger while workflow migration is still in
 * progress. Manual `workflow_dispatch` may still override intentionally.
 *
 * This test fails if someone removes the substrate gate and reintroduces the
 * double-deploy.
 */

const WORKFLOWS = resolve(process.cwd(), ".github/workflows");

function read(file: string): string {
  return readFileSync(resolve(WORKFLOWS, file), "utf-8");
}

describe("Deploy substrate governance", () => {
  it("k8s auto-deploy (deploy.yml) is gated behind DEPLOY_TARGET == 'k8s'", () => {
    const yml = read("deploy.yml");

    // The deploy job's `if:` block governs when the substrate activates.
    expect(yml).toContain("vars.DEPLOY_TARGET == 'k8s'");

    // The automatic (workflow_run) path must be conjoined with the gate, not
    // left unconditional. Assert the workflow_run branch and the gate co-occur
    // on the same condition line so the gate cannot be trivially bypassed.
    const gatedWorkflowRun =
      /github\.event_name == 'workflow_run'[\s\S]{0,200}?vars\.DEPLOY_TARGET == 'k8s'/;
    expect(
      gatedWorkflowRun.test(yml),
      "deploy.yml workflow_run trigger must be gated by vars.DEPLOY_TARGET == 'k8s'",
    ).toBe(true);
  });

  it("legacy ECS PM2 workflow is manual-only so it cannot auto-deploy frontends or gateway", () => {
    const yml = read("deploy-ecs.yml");
    expect(yml).toContain("workflow_dispatch:");
    expect(yml).not.toMatch(/\n\s+push:\n/);
    expect(yml).not.toContain("branches: [main]");
  });

  it("legacy ECS PM2 workflow still detects gateway source changes for manual fallback deploys", () => {
    const yml = read("deploy-ecs.yml");
    expect(yml).toContain("backends/gateway/**");
    expect(yml).toContain("pnpm --filter @nebutra/gateway build");
    expect(yml).toContain("https://api.nebutra.com/api/misc/health");
  });

  it("legacy ECS workflow no longer claims to be the default-active backend substrate", () => {
    const yml = read("deploy-ecs.yml");
    const k8s = read("deploy.yml");

    expect(yml).not.toContain("DEFAULT-ACTIVE");
    expect(k8s).not.toContain("DEFAULT-ACTIVE backend substrate");
    expect(yml).not.toContain("vars.DEPLOY_TARGET == 'ecs");
  });

  it("legacy ECS workflow packages apps/web as Next standalone so desktop OAuth route handlers survive fallback deploys", () => {
    const yml = read("deploy-ecs.yml");
    const webPackage = readFileSync(resolve(process.cwd(), "apps/web/package.json"), "utf-8");
    const pm2Config = readFileSync(
      resolve(process.cwd(), "infra/iac/ecs/ecosystem.config.cjs"),
      "utf-8",
    );
    const remote = readFileSync(
      resolve(process.cwd(), "infra/ops/scripts/ecs-deploy-remote.sh"),
      "utf-8",
    );

    expect(yml).toContain('package: "@nebutra/web"');
    expect(yml).toContain('kind: "next-standalone"');
    expect(yml).toContain('build_command: "build:next"');
    expect(yml).toContain("pnpm --filter ${{ matrix.package }} ${{ matrix.build_command }}");
    expect(yml).toContain('cp -r "$WS/.next/standalone/." "$STAGE/"');
    expect(yml).not.toContain("ECS Vite SPA static server");
    expect(yml).toContain("web-desktop-auth-foundryoss");
    expect(yml).toContain("https://app.nebutra.com/signup/remote?scheme=foundryoss");

    expect(webPackage).toContain('"build:next"');
    expect(pm2Config).toContain('script: "apps/web/server.js"');
    expect(pm2Config).toContain(
      "$DEPLOY_ROOT/web/current/apps/web/server.js                  (Next standalone)",
    );
    expect(remote).toContain("NEXT_PUBLIC_APP_URL");
    expect(remote).toContain("BETTER_AUTH_URL");
  });
});
