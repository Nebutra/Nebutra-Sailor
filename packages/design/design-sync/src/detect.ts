import type { DesignSyncProviderType } from "./types";

// =============================================================================
// Provider Auto-Detection
// =============================================================================
// Resolution order (highest priority first):
//   1. DESIGN_SYNC_PROVIDER env var (explicit)
//   2. fallback                                      → "git-only"
//
// `memory` and `design-md` are never auto-detected; they must be requested
// explicitly via the DESIGN_SYNC_PROVIDER env var or a config object.
// =============================================================================

const VALID_PROVIDERS: ReadonlySet<DesignSyncProviderType> = new Set([
  "git-only",
  "memory",
  "design-md",
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

  const known = ["DESIGN_SYNC_PROVIDER", "DESIGN_MD_PATH"] as const;

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
