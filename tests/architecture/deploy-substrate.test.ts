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

  it("legacy ECS workflow is still visible as the current migration bridge", () => {
    const yml = read("deploy-ecs.yml");
    // This assertion documents current workflow reality only. The desired
    // long-term contract is per-service `DEPLOY_TARGET_*` gating.
    expect(yml).not.toContain("vars.DEPLOY_TARGET == 'ecs");
  });
});
