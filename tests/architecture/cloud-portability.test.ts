import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readText(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("cloud platform portability contract", () => {
  it("declares AWS, GCP, VM, Kubernetes, and Vercel as explicit platform adapters", () => {
    const manifestPath = "infra/platforms/cloud-portability.json";

    expect(existsSync(join(root, manifestPath))).toBe(true);

    const manifest = JSON.parse(readText(manifestPath)) as {
      providers?: Record<
        string,
        {
          status?: string;
          compute?: readonly string[];
          registry?: { kind?: string };
          auth?: { githubActions?: string };
          terraformModule?: string;
        }
      >;
    };

    expect(Object.keys(manifest.providers ?? {}).sort()).toEqual([
      "aws",
      "cloud-vm",
      "gcp",
      "k8s",
      "vercel",
    ]);
    expect(manifest.providers?.aws?.registry?.kind).toBe("ecr");
    expect(manifest.providers?.aws?.auth?.githubActions).toBe("oidc");
    expect(manifest.providers?.gcp?.registry?.kind).toBe("artifact-registry");
    expect(manifest.providers?.gcp?.auth?.githubActions).toBe("workload-identity-federation");
    expect(manifest.providers?.gcp?.compute).toEqual(
      expect.arrayContaining(["gke", "cloud-run", "compute-engine"]),
    );
  });

  it("does not claim a CI image-publish path it no longer has", () => {
    // docker-build-push.yml (GHCR + ECR + Artifact Registry, cosign, Trivy) was
    // retired on 2026-09-02 after five months without a run. The registry
    // adapters are still described per provider and provisioned by Terraform;
    // the manifest must not list a publish workflow that does not exist, and a
    // future one must be added back here deliberately.
    expect(existsSync(join(root, ".github/workflows/docker-build-push.yml"))).toBe(false);
    const manifest = JSON.parse(readText("infra/platforms/cloud-portability.json")) as {
      principles?: string[];
    };
    expect(manifest.principles?.join("\n")).toContain("no CI workflow publishes images");
  });

  it("keeps GCP as a dormant deploy target without changing production defaults", () => {
    const gatewayWorkflow = readText(".github/workflows/deploy-gateway.yml");
    const originWorkflow = readText(".github/workflows/deploy-origin-ecs.yml");
    const deployTargets = readText("packages/ops/preset/src/deploy-target.ts");
    const createSailorDeploy = readText("packages/ops/create-sailor/src/utils/deploy.ts");

    expect(gatewayWorkflow).toContain("          - gcp");
    expect(originWorkflow).toContain("          - gcp");
    expect(deployTargets).toContain('"gcp"');
    expect(deployTargets).toContain('edgeGateway: "cloudflare-workers"');
    expect(deployTargets).toContain('originBackend: "ecs-docker"');
    // The scaffold deliberately holds no target list of its own — it imports
    // the map type and the defaults from the preset, so a target added there
    // reaches create-sailor without a second edit. Grepping for the literal
    // "gcp" here asserted the duplication that import removed, and went red the
    // moment the two were deduplicated.
    expect(createSailorDeploy).toContain('from "@nebutra/preset/deploy-target"');
    expect(createSailorDeploy).toContain("getDefaultDeployTargets");
    expect(createSailorDeploy).not.toMatch(/originBackend:\s*\[/);
  });

  it("adds a GCP Terraform scaffold while preserving AWS as an active provider option", () => {
    const prodTerraform = readText("infra/iac/terraform/environments/prod/main.tf");
    const gcpModulePath = "infra/iac/terraform/modules/gcp/main.tf";
    const gcpModule = readText(gcpModulePath);

    expect(existsSync(join(root, gcpModulePath))).toBe(true);
    expect(prodTerraform).toContain('source  = "hashicorp/google"');
    expect(prodTerraform).toContain('contains(["vercel", "aws", "gcp", "aliyun", "tencent"]');
    expect(prodTerraform).toContain('module "aws"');
    expect(prodTerraform).toContain('module "gcp"');
    expect(prodTerraform).toContain('output "gcp_outputs"');
    expect(gcpModule).toContain("google_artifact_registry_repository");
    expect(gcpModule).not.toContain('resource "google_cloud_run_service"');
    expect(gcpModule).not.toContain('resource "google_cloud_run_v2_service"');
    expect(gcpModule).not.toContain('resource "google_container_cluster"');
    expect(gcpModule).not.toContain('resource "google_compute_instance"');
    expect(gcpModule).not.toContain('resource "google_compute_region_instance_group_manager"');
  });

  it("exposes a local doctor command for cloud portability drift", () => {
    const pkg = JSON.parse(readText("package.json")) as { scripts?: Record<string, string> };
    const ciWorkflow = readText(".github/workflows/ci.yml");
    const manifest = JSON.parse(readText("infra/platforms/cloud-portability.json")) as {
      ci?: { doctor?: string; verify?: string; workflows?: string[] };
    };

    expect(existsSync(join(root, "scripts/verify-cloud-portability.mjs"))).toBe(true);
    expect(pkg.scripts?.["cloud:verify"]).toBe("node scripts/verify-cloud-portability.mjs");
    expect(pkg.scripts?.["cloud:doctor"]).toBe(
      "node scripts/verify-cloud-portability.mjs --doctor",
    );
    expect(manifest.ci?.doctor).toBe("pnpm cloud:doctor");
    expect(manifest.ci?.verify).toBe("pnpm cloud:verify");
    expect(manifest.ci?.workflows ?? []).toEqual([
      ".github/workflows/deploy-gateway.yml",
      ".github/workflows/deploy-origin-ecs.yml",
    ]);
    for (const workflow of manifest.ci?.workflows ?? []) {
      expect(existsSync(join(root, workflow))).toBe(true);
    }
    expect(ciWorkflow).toContain("Verify cloud portability contract");
    expect(ciWorkflow).toContain("cloud:verify");
  });
});
