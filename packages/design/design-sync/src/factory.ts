import { logger } from "@nebutra/logger";
import { detectProvider } from "./detect";
import type { DesignSyncConfig, DesignSyncProvider, DesignSyncProviderType } from "./types";

// =============================================================================
// Design-Sync Factory — Provider-agnostic creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createDesignSync()`
//   2. `DESIGN_SYNC_PROVIDER` environment variable
//   3. fallback → git-only
//
// This lets customers switch between the git-only workflow and the AI-native
// DESIGN.md serialization without changing application code.
// =============================================================================

let defaultProvider: DesignSyncProvider | null = null;

/**
 * Create a design-sync provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const sync = await createDesignSync();
 *
 * // Explicit git-only (zero config)
 * const sync = await createDesignSync({ provider: "git-only" });
 *
 * // Explicit design-md
 * const sync = await createDesignSync({ provider: "design-md" });
 * ```
 */
export async function createDesignSync(config?: DesignSyncConfig): Promise<DesignSyncProvider> {
  const providerType: DesignSyncProviderType = config?.provider ?? detectProvider();

  logger.info("[design-sync] Creating provider", { provider: providerType });

  switch (providerType) {
    case "git-only": {
      const { GitOnlyProvider } = await import("./providers/git-only");
      const gitConfig = config?.provider === "git-only" ? config : undefined;
      return new GitOnlyProvider(gitConfig ?? { provider: "git-only" });
    }

    case "memory": {
      const { MemoryProvider } = await import("./providers/memory");
      const memConfig = config?.provider === "memory" ? config : undefined;
      return new MemoryProvider(memConfig ?? { provider: "memory" });
    }

    case "design-md": {
      const { DesignMdProvider } = await import("./providers/design-md");
      const mdConfig = config?.provider === "design-md" ? config : undefined;
      return new DesignMdProvider(mdConfig ?? { provider: "design-md" });
    }

    default:
      throw new Error(`Unknown design-sync provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) design-sync provider.
 * Lazy initialisation avoids import-time side effects.
 */
export async function getDesignSync(): Promise<DesignSyncProvider> {
  if (!defaultProvider) {
    defaultProvider = await createDesignSync();
  }
  return defaultProvider;
}

/**
 * Replace the default design-sync provider (useful in tests).
 */
export function setDesignSync(provider: DesignSyncProvider): void {
  defaultProvider = provider;
}

/**
 * Reset the singleton — primarily for test isolation.
 */
export function resetDesignSync(): void {
  defaultProvider = null;
}
