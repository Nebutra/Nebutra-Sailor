import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type DeployTargetMap, getDefaultDeployTargets } from "../../../preset/src/deploy-target";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ScaffoldDeployTarget = "vercel" | "railway" | "cloudflare" | "selfhost" | "none";

/** Same shape as `@nebutra/preset` deploy-target map — keep scaffold in lock-step. */
export type ScaffoldDeployTargetMap = DeployTargetMap;

const FRONTEND_CLOUDFLARE = "cloudflare-pages" as const;
const FRONTEND_STANDALONE = "standalone" as const;
const FRONTEND_RAILWAY = "railway" as const;

function withFrontends(
  base: DeployTargetMap,
  frontend: DeployTargetMap["web"],
  gateway: DeployTargetMap["gateway"],
  pythonAi: DeployTargetMap["python-ai"],
): DeployTargetMap {
  return {
    ...base,
    web: frontend,
    landing: frontend,
    auth: frontend,
    admin: frontend,
    "design-docs": frontend,
    "sailor-docs": frontend,
    router: frontend,
    forge: frontend,
    typelens: frontend,
    gateway,
    "python-ai": pythonAi,
  };
}

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
  const defaults = getDefaultDeployTargets();
  switch (target) {
    case "cloudflare":
      return withFrontends(defaults, FRONTEND_CLOUDFLARE, "cloudflare-workers", "ecs-docker");
    case "selfhost":
      return withFrontends(defaults, FRONTEND_STANDALONE, "ecs-docker", "ecs-docker");
    case "railway":
      return withFrontends(defaults, FRONTEND_RAILWAY, "railway", "railway");
    case "none":
    case "vercel":
      return defaults;
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

  // Read-then-act (no existsSync check) avoids a check-then-use file race:
  // a missing .env.example simply means there is nothing to augment.
  let existing: string;
  try {
    existing = await fs.promises.readFile(envPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
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
