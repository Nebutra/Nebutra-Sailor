import fs from "node:fs";
import path from "node:path";

import {
  CACHE_PROVIDERS,
  type CacheProviderId,
  type CacheProviderMeta,
  getCacheProvider,
} from "./cache-meta.js";

/**
 * Cache selection applier for create-sailor.
 *
 * L2 depth: the scaffolded project already ships `packages/cache` with a real
 * provider-agnostic implementation that reads `process.env.CACHE_PROVIDER`.
 * This applier only:
 *   1. Removes the package entirely when the user picks `none`.
 *   2. Injects provider-specific env vars + sets `CACHE_PROVIDER` in
 *      `.env.example` when the user picks a concrete provider.
 *
 * It is idempotent — safe to run twice without duplicating env blocks.
 * It silently skips when `packages/cache` isn't present in the template.
 */

// ─── Filesystem helpers ─────────────────────────────────────────────────────

function readEnvFile(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null;
  return fs.readFileSync(envPath, "utf-8");
}

function appendEnvBlock(targetDir: string, provider: CacheProviderMeta): void {
  const envPath = path.join(targetDir, ".env.example");
  const existing = readEnvFile(envPath);
  if (existing === null) return;

  const marker = `# Cache: ${provider.name}`;
  if (existing.includes(marker)) return; // idempotent — already injected

  const block = [
    "",
    "# =============================================",
    marker,
    `# Docs: ${provider.docs}`,
    "# =============================================",
    ...provider.envVars.map((v) => `${v}=""`),
    "",
  ].join("\n");

  fs.appendFileSync(envPath, block);
}

function upsertEnvVar(targetDir: string, key: string, value: string): void {
  const envPath = path.join(targetDir, ".env.example");
  const existing = readEnvFile(envPath);
  if (existing === null) return;

  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(existing)) {
    fs.writeFileSync(envPath, existing.replace(regex, `${key}="${value}"`));
  } else {
    fs.appendFileSync(envPath, `${key}="${value}"\n`);
  }
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function applyCacheSelection(
  targetDir: string,
  cacheId: CacheProviderId | string,
  _region: string,
): Promise<void> {
  const cachePkgDir = path.join(targetDir, "packages", "cache");

  if (cacheId === "none") {
    if (fs.existsSync(cachePkgDir)) {
      fs.rmSync(cachePkgDir, { recursive: true, force: true });
    }
    return;
  }

  const provider = getCacheProvider(cacheId);
  if (!provider) {
    throw new Error(
      `Unknown cache provider "${cacheId}". Valid ids: ${CACHE_PROVIDERS.map((p) => p.id).join(
        ", ",
      )}`,
    );
  }

  if (!fs.existsSync(cachePkgDir)) return;

  appendEnvBlock(targetDir, provider);
  upsertEnvVar(targetDir, "CACHE_PROVIDER", cacheId);
}

export type { CacheProviderId };
