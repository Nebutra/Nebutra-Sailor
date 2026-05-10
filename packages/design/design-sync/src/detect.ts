import type { DesignSyncProviderType } from "./types";

// =============================================================================
// Provider Auto-Detection
// =============================================================================
// Resolution order (highest priority first):
//   1. DESIGN_SYNC_PROVIDER env var (explicit)
//   2. FIGMA_PERSONAL_ACCESS_TOKEN + FIGMA_FILE_ID  → "figma"
//   3. PENPOT_API_URL + PENPOT_TOKEN                → "penpot"
//   4. fallback                                      → "git-only"
//
// `memory` is never auto-detected; it must be requested explicitly via the
// DESIGN_SYNC_PROVIDER env var or a config object (used in tests).
// =============================================================================

const VALID_PROVIDERS: ReadonlySet<DesignSyncProviderType> = new Set([
  "figma",
  "penpot",
  "git-only",
  "memory",
]);

/**
 * Read `DESIGN_SYNC_PROVIDER` from the environment, validate it, and return
 * the typed value if it matches a known provider.
 */
export function readConfiguredProvider(
  env: NodeJS.ProcessEnv = process.env,
): DesignSyncProviderType | undefined {
  const raw = env.DESIGN_SYNC_PROVIDER?.trim();
  if (!raw) return undefined;
  if (!VALID_PROVIDERS.has(raw as DesignSyncProviderType)) {
    return undefined;
  }
  return raw as DesignSyncProviderType;
}

/**
 * Detect the provider from a snapshot of environment variables.
 * Pure function — does NOT touch `process.env` directly so it is unit-testable.
 */
export function detectProvider(env: NodeJS.ProcessEnv = process.env): DesignSyncProviderType {
  const explicit = readConfiguredProvider(env);
  if (explicit) return explicit;

  const figmaToken = env.FIGMA_PERSONAL_ACCESS_TOKEN?.trim();
  const figmaFileId = env.FIGMA_FILE_ID?.trim();
  if (figmaToken && figmaFileId) return "figma";

  const penpotUrl = env.PENPOT_API_URL?.trim();
  const penpotToken = env.PENPOT_TOKEN?.trim();
  if (penpotUrl && penpotToken) return "penpot";

  return "git-only";
}

/**
 * For diagnostics: return which env vars were detected and which are missing
 * for each provider. Used by `healthcheck()` and the `detect` CLI command.
 */
export function describeEnv(env: NodeJS.ProcessEnv = process.env): {
  detected: string[];
  missing: string[];
  resolved: DesignSyncProviderType;
} {
  const detected: string[] = [];
  const missing: string[] = [];

  const known = [
    "DESIGN_SYNC_PROVIDER",
    "FIGMA_PERSONAL_ACCESS_TOKEN",
    "FIGMA_FILE_ID",
    "FIGMA_GITHUB_REPO",
    "FIGMA_GITHUB_BRANCH",
    "PENPOT_API_URL",
    "PENPOT_TOKEN",
    "PENPOT_FILE_ID",
    "PENPOT_TEAM_ID",
  ] as const;

  for (const key of known) {
    if (env[key]?.trim()) detected.push(key);
    else missing.push(key);
  }

  return {
    detected,
    missing,
    resolved: detectProvider(env),
  };
}
