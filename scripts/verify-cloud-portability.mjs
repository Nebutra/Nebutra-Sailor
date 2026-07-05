#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const doctorMode = process.argv.includes("--doctor");

function readText(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function includesAll(text, expected, label, failures) {
  const missing = expected.filter((item) => !text.includes(item));
  assert(missing.length === 0, `${label} missing: ${missing.join(", ")}`, failures);
}

function providerIds(manifest) {
  return Object.keys(manifest.providers ?? {}).sort();
}

const failures = [];
const writeLine = (message = "") => {
  process.stdout.write(`${message}\n`);
};
const writeErrorLine = (message = "") => {
  process.stderr.write(`${message}\n`);
};
const manifestPath = "infra/platforms/cloud-portability.json";

assert(existsSync(resolve(root, manifestPath)), `${manifestPath} does not exist`, failures);

const manifest = existsSync(resolve(root, manifestPath)) ? readJson(manifestPath) : {};
const expectedProviders = ["aws", "cloud-vm", "gcp", "k8s", "vercel"];

assert(
  JSON.stringify(providerIds(manifest)) === JSON.stringify(expectedProviders),
  `platform manifest providers must be ${expectedProviders.join(", ")}`,
  failures,
);

assert(manifest.providers?.aws?.registry?.kind === "ecr", "AWS registry must be ECR", failures);
assert(
  manifest.providers?.aws?.auth?.githubActions === "oidc",
  "AWS CI auth must be OIDC",
  failures,
);
assert(
  manifest.providers?.gcp?.registry?.kind === "artifact-registry",
  "GCP registry must be Artifact Registry",
  failures,
);
assert(
  manifest.providers?.gcp?.auth?.githubActions === "workload-identity-federation",
  "GCP CI auth must use Workload Identity Federation",
  failures,
);

const dockerWorkflow = readText(".github/workflows/docker-build-push.yml");
includesAll(
  dockerWorkflow,
  [
    "AWS_ECR_ROLE_ARN",
    "aws-actions/configure-aws-credentials",
    "aws-actions/amazon-ecr-login",
    "GCP_PROJECT_ID",
    "GCP_REGION",
    "GCP_ARTIFACT_REPOSITORY",
    "GCP_WORKLOAD_IDENTITY_PROVIDER",
    "GCP_SERVICE_ACCOUNT",
    "google-github-actions/auth@c200f3691d83b41bf9bbd8638997a462592937ed",
    "token_format: access_token",
    "oauth2accesstoken",
    "-docker.pkg.dev",
  ],
  ".github/workflows/docker-build-push.yml",
  failures,
);

const deployGateway = readText(".github/workflows/deploy-gateway.yml");
const deployOrigin = readText(".github/workflows/deploy-origin-ecs.yml");
assert(
  deployGateway.includes("          - gcp"),
  "deploy-gateway dispatch must expose gcp",
  failures,
);
assert(
  deployOrigin.includes("          - gcp"),
  "deploy-origin dispatch must expose gcp",
  failures,
);

const deployTargets = readText("packages/ops/preset/src/deploy-target.ts");
includesAll(
  deployTargets,
  ['"gcp"', 'edgeGateway: "cloudflare-workers"', 'originBackend: "ecs-docker"'],
  "packages/ops/preset/src/deploy-target.ts",
  failures,
);

const createSailorDeploy = readText("packages/ops/create-sailor/src/utils/deploy.ts");
assert(
  createSailorDeploy.includes('"gcp"'),
  "create-sailor deploy target map must include gcp",
  failures,
);

const prodTerraform = readText("infra/iac/terraform/environments/prod/main.tf");
includesAll(
  prodTerraform,
  [
    'source  = "hashicorp/google"',
    'contains(["vercel", "aws", "gcp", "aliyun", "tencent"]',
    'module "aws"',
    'module "gcp"',
    'output "gcp_outputs"',
  ],
  "infra/iac/terraform/environments/prod/main.tf",
  failures,
);

const gcpModulePath = "infra/iac/terraform/modules/gcp/main.tf";
assert(existsSync(resolve(root, gcpModulePath)), `${gcpModulePath} does not exist`, failures);
if (existsSync(resolve(root, gcpModulePath))) {
  assert(
    readText(gcpModulePath).includes("google_artifact_registry_repository"),
    `${gcpModulePath} must provision Artifact Registry`,
    failures,
  );
}

const pkg = readJson("package.json");
assert(
  pkg.scripts?.["cloud:verify"] === "node scripts/verify-cloud-portability.mjs",
  "package.json must expose cloud:verify",
  failures,
);
assert(
  pkg.scripts?.["cloud:doctor"] === "node scripts/verify-cloud-portability.mjs --doctor",
  "package.json must expose cloud:doctor",
  failures,
);

if (doctorMode) {
  const active = manifest.defaultTopology ?? {};
  writeLine(`[cloud-portability] providers: ${providerIds(manifest).join(", ")}`);
  writeLine(
    `[cloud-portability] defaults: frontend=${active.frontend}, gateway=${active.gateway}, originBackend=${active.originBackend}`,
  );
  writeLine(
    `[cloud-portability] AWS registry: ${manifest.providers?.aws?.registry?.kind ?? "missing"}`,
  );
  writeLine(
    `[cloud-portability] GCP registry: ${manifest.providers?.gcp?.registry?.kind ?? "missing"}`,
  );
  writeLine("[cloud-portability] CI workflow: .github/workflows/docker-build-push.yml");
  writeLine("[cloud-portability] Terraform modules: aws, gcp");
}

if (failures.length > 0) {
  for (const failure of failures) {
    writeErrorLine(`cloud-portability: ${failure}`);
  }
  process.exit(1);
}

writeLine("cloud portability contract: ok");
