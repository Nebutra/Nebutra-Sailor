import fs from "node:fs";
import path from "node:path";

import {
  getQueueProvider,
  QUEUE_PROVIDERS,
  type QueueProviderId,
  type QueueProviderMeta,
} from "./queue-meta.js";

/**
 * Queue selection applier for create-sailor.
 *
 * L2 depth: the scaffolded project already ships `packages/queue` with a real
 * provider-agnostic implementation that reads `process.env.QUEUE_PROVIDER`.
 * This applier only:
 *   1. Removes the package entirely when the user picks `none`.
 *   2. Injects provider-specific env vars + sets `QUEUE_PROVIDER` in
 *      `.env.example` when the user picks a concrete provider.
 *
 * It is idempotent — safe to run twice without duplicating env blocks.
 * It silently skips when `packages/queue` isn't present in the template.
 */

// ─── Filesystem helpers ─────────────────────────────────────────────────────

function readEnvFile(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null;
  return fs.readFileSync(envPath, "utf-8");
}

function appendEnvBlock(targetDir: string, provider: QueueProviderMeta): void {
  const envPath = path.join(targetDir, ".env.example");
  const existing = readEnvFile(envPath);
  if (existing === null) return;

  const marker = `# Queue: ${provider.name}`;
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

export async function applyQueueSelection(
  targetDir: string,
  queueId: QueueProviderId | string,
  _region: string,
): Promise<void> {
  const queuePkgDir = path.join(targetDir, "packages", "queue");

  if (queueId === "none") {
    // Remove the package entirely.
    if (fs.existsSync(queuePkgDir)) {
      fs.rmSync(queuePkgDir, { recursive: true, force: true });
    }
    return;
  }

  const provider = getQueueProvider(queueId);
  if (!provider) {
    throw new Error(
      `Unknown queue provider "${queueId}". Valid ids: ${QUEUE_PROVIDERS.map((p) => p.id).join(
        ", ",
      )}`,
    );
  }

  // Silent skip if the template doesn't ship the queue package at all.
  if (!fs.existsSync(queuePkgDir)) return;

  appendEnvBlock(targetDir, provider);
  upsertEnvVar(targetDir, "QUEUE_PROVIDER", queueId);
}

export type { QueueProviderId };
