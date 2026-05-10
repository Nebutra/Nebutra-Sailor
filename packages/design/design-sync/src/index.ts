// =============================================================================
// @nebutra/design-sync — Provider-agnostic design-tool sync
// =============================================================================
// Supports:
//   - Figma + Tokens Studio  (DTCG via GitHub, plugin owns the transport)
//   - Penpot                  (REST API, self-hostable, China-friendly)
//   - git-only                (zero-config default — DTCG files only)
//   - memory                  (test fixture)
//
// Usage:
//   import { getDesignSync } from "@nebutra/design-sync";
//
//   const sync = await getDesignSync();      // auto-detect provider
//   const result = await sync.pull();        // design-tool → repo
//   await sync.push({ dryRun: true });       // repo → design-tool
//   await sync.healthcheck();
// =============================================================================

// ── Detection helpers ───────────────────────────────────────────────────────
export { describeEnv, detectProvider, readConfiguredProvider } from "./detect";
// ── Factory ─────────────────────────────────────────────────────────────────
export {
  createDesignSync,
  getDesignSync,
  resetDesignSync,
  setDesignSync,
} from "./factory";
export type { FigmaTokensStudioConfig } from "./figma-config/index";
// ── Figma config snapshot ───────────────────────────────────────────────────
export { FIGMA_TOKENS_STUDIO_CONFIG } from "./figma-config/index";
// ── DTCG I/O helpers (re-exported for advanced consumers) ───────────────────
export {
  defaultTokensDir,
  defaultTokensStudioDir,
  readTokenSets,
  validateDtcgTree,
  writeTokenSet,
} from "./io";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { FigmaProvider } from "./providers/figma";
export { GitOnlyProvider } from "./providers/git-only";
export { MemoryProvider } from "./providers/memory";
export { PenpotProvider } from "./providers/penpot";
export type {
  BaseProviderConfig,
  DesignSyncConfig,
  DesignSyncProvider,
  DesignSyncProviderType,
  DesignTokenLeaf,
  DesignTokenSet,
  DesignTokenTree,
  FigmaProviderConfig,
  GitOnlyProviderConfig,
  HealthStatus,
  MemoryProviderConfig,
  PenpotProviderConfig,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "./types";
// ── Types ───────────────────────────────────────────────────────────────────
export { DesignTokenLeafSchema } from "./types";
