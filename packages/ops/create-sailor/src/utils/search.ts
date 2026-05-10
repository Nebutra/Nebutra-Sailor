import fs from "node:fs";
import path from "node:path";

import {
  getSearchProvider,
  SEARCH_PROVIDERS,
  type SearchProviderId,
  type SearchProviderMeta,
} from "./search-meta.js";

/**
 * Search selection applier for create-sailor.
 *
 * L2 depth: the scaffolded project already ships `packages/search` with a real
 * provider-agnostic implementation that reads `process.env.SEARCH_PROVIDER`.
 * This applier only:
 *   1. Removes the package entirely when the user picks `none`.
 *   2. Injects provider-specific env vars + sets `SEARCH_PROVIDER` in
 *      `.env.example` when the user picks a concrete provider.
 *
 * It is idempotent — safe to run twice without duplicating env blocks.
 * It silently skips when `packages/search` isn't present in the template.
 */

// ─── Filesystem helpers ─────────────────────────────────────────────────────

function readEnvFile(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null;
  return fs.readFileSync(envPath, "utf-8");
}

function appendEnvBlock(targetDir: string, provider: SearchProviderMeta): void {
  const envPath = path.join(targetDir, ".env.example");
  const existing = readEnvFile(envPath);
  if (existing === null) return;

  const marker = `# Search: ${provider.name}`;
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

export async function applySearchSelection(
  targetDir: string,
  searchId: SearchProviderId | string,
  _region: string,
): Promise<void> {
  const searchPkgDir = path.join(targetDir, "packages", "search");

  if (searchId === "none") {
    if (fs.existsSync(searchPkgDir)) {
      fs.rmSync(searchPkgDir, { recursive: true, force: true });
    }
    return;
  }

  const provider = getSearchProvider(searchId);
  if (!provider) {
    throw new Error(
      `Unknown search provider "${searchId}". Valid ids: ${SEARCH_PROVIDERS.map((p) => p.id).join(
        ", ",
      )}`,
    );
  }

  if (!fs.existsSync(searchPkgDir)) return;

  appendEnvBlock(targetDir, provider);
  upsertEnvVar(targetDir, "SEARCH_PROVIDER", searchId);
}

export type { SearchProviderId };
