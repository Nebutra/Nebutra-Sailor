import fs from "node:fs";
import path from "node:path";

/**
 * `nebutra.config.json` — the project manifest `nebutra status` / `sync` read.
 *
 * It names capabilities, never providers: which vendor runs is decided by the
 * keys present in the environment (ADR 2026-09-24 Sailor convergence).
 */
export interface NebutraConfig {
  stack: "sailor-2026-09";
  capabilities: string[];
}

export const DEFAULT_CAPABILITIES = [
  "auth",
  "billing",
  "email",
  "storage",
  "queue",
  "cache",
  "notifications",
  "webhooks",
  "ai",
  "mcp",
];

export function defaultConfig(): NebutraConfig {
  return {
    stack: "sailor-2026-09",
    capabilities: [...DEFAULT_CAPABILITIES],
  };
}

export async function writeNebutraConfig(targetDir: string, config: NebutraConfig) {
  const configPath = path.join(targetDir, "nebutra.config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}
