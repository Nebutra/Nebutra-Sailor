import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Single-active-substrate governance.
 *
 * deploy-ecs.yml (Aliyun ECS / PM2) is the DEFAULT-ACTIVE backend substrate.
 * The Kubernetes path (deploy.yml) must stay DORMANT on the automatic
 * `workflow_run` trigger unless the repo variable DEPLOY_TARGET == 'k8s', so no
 * service is auto-deployed to two substrates at once (the drift behind
 * #141-class incidents, where gateway/landing deployed to ECS + k8s + Vercel
 * simultaneously). Manual `workflow_dispatch` may still override intentionally.
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

  it("ECS (deploy-ecs.yml) remains the default-active substrate (not DEPLOY_TARGET-gated off)", () => {
    const yml = read("deploy-ecs.yml");
    // ECS is the default backend path: it must NOT require DEPLOY_TARGET to run,
    // otherwise no substrate would be active by default.
    expect(yml).not.toContain("vars.DEPLOY_TARGET == 'ecs");
  });
});
