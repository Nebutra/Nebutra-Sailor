import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ScaffoldDeployTarget = "vercel" | "railway" | "cloudflare" | "selfhost" | "none";

export type ScaffoldDeployTargetMap = {
  web: "vercel" | "standalone" | "cloudflare-pages" | "railway";
  "landing-page": "vercel" | "standalone" | "cloudflare-pages" | "railway";
  "design-docs": "vercel" | "standalone" | "cloudflare-pages" | "railway";
  "sailor-docs": "vercel" | "standalone" | "cloudflare-pages" | "railway";
  gateway: "cloudflare-workers" | "vercel-functions" | "ecs-docker" | "k8s" | "aws" | "railway";
  "python-ai": "ecs-docker" | "k8s" | "aws" | "railway";
};

const DEFAULT_DEPLOY_TARGETS = {
  web: "vercel",
  "landing-page": "vercel",
  "design-docs": "vercel",
  "sailor-docs": "vercel",
  gateway: "cloudflare-workers",
  "python-ai": "ecs-docker",
} as const satisfies ScaffoldDeployTargetMap;

/**
 * Resolve the deploy templates directory in both dev (src/) and built (dist/)
 * layouts. tsup bundles to a single dist/index.js so the relative depth
 * differs between modes; check both.
 */
function resolveDeployTemplatesDir(): string {
  const candidates = [
    // dist/index.js → ../templates/deploy
    path.join(__dirname, "..", "templates", "deploy"),
    // src/utils/deploy.ts → ../../templates/deploy
    path.join(__dirname, "..", "..", "templates", "deploy"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function resolveScaffoldDeployTargets(
  target: ScaffoldDeployTarget,
): ScaffoldDeployTargetMap {
  switch (target) {
    case "cloudflare":
      return {
        web: "cloudflare-pages",
        "landing-page": "cloudflare-pages",
        "design-docs": "cloudflare-pages",
        "sailor-docs": "cloudflare-pages",
        gateway: "cloudflare-workers",
        "python-ai": "ecs-docker",
      };
    case "selfhost":
      return {
        web: "standalone",
        "landing-page": "standalone",
        "design-docs": "standalone",
        "sailor-docs": "standalone",
        gateway: "ecs-docker",
        "python-ai": "ecs-docker",
      };
    case "railway":
      return {
        web: "railway",
        "landing-page": "railway",
        "design-docs": "railway",
        "sailor-docs": "railway",
        gateway: "railway",
        "python-ai": "railway",
      };
    case "none":
    case "vercel":
      return { ...DEFAULT_DEPLOY_TARGETS };
  }
}

function deployTargetEnvKey(service: string): string {
  return `DEPLOY_TARGET_${service.toUpperCase().replace(/-/g, "_")}`;
}

async function copyGatewayWorkerManifest(targetDir: string, templatesDir: string): Promise<void> {
  const gatewayDir = path.join(targetDir, "backends", "gateway");
  if (!fs.existsSync(gatewayDir)) return;

  await fs.promises.copyFile(
    path.join(templatesDir, "wrangler.gateway.toml"),
    path.join(gatewayDir, "wrangler.toml"),
  );
}

export async function appendDeployTargetEnv(
  targetDir: string,
  deployTargets: ScaffoldDeployTargetMap,
): Promise<void> {
  const envPath = path.join(targetDir, ".env.example");
  if (!fs.existsSync(envPath)) return;

  const existing = await fs.promises.readFile(envPath, "utf8");
  if (existing.includes("# Deployment Targets")) return;

  const lines = Object.entries(deployTargets).map(
    ([service, target]) => `${deployTargetEnvKey(service)}="${target}"`,
  );
  const block = ["", "# Deployment Targets", ...lines].join("\n");

  await fs.promises.appendFile(envPath, `${block}\n`);
}

export async function applyDeployTarget(targetDir: string, target: ScaffoldDeployTarget) {
  if (target === "none") return;

  const templatesDir = resolveDeployTemplatesDir();

  if (target === "vercel") {
    await fs.promises.copyFile(
      path.join(templatesDir, "vercel.json"),
      path.join(targetDir, "vercel.json"),
    );
    await copyGatewayWorkerManifest(targetDir, templatesDir);
  } else if (target === "railway") {
    await fs.promises.copyFile(
      path.join(templatesDir, "railway.toml"),
      path.join(targetDir, "railway.toml"),
    );
  } else if (target === "cloudflare") {
    await fs.promises.copyFile(
      path.join(templatesDir, "wrangler.toml"),
      path.join(targetDir, "wrangler.toml"),
    );
    await copyGatewayWorkerManifest(targetDir, templatesDir);
  } else if (target === "selfhost") {
    await fs.promises.copyFile(
      path.join(templatesDir, "docker-compose.yml"),
      path.join(targetDir, "docker-compose.yml"),
    );
    await fs.promises.copyFile(
      path.join(templatesDir, "Dockerfile.web"),
      path.join(targetDir, "Dockerfile.web"),
    );
  }
}
