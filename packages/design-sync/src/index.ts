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
export { describeEnv, detectProvider, readConfiguredProvider } from "./detect.js";
// ── Factory ─────────────────────────────────────────────────────────────────
export {
  createDesignSync,
  getDesignSync,
  resetDesignSync,
  setDesignSync,
} from "./factory.js";
export type { FigmaTokensStudioConfig } from "./figma-config/index.js";
// ── Figma config snapshot ───────────────────────────────────────────────────
export { FIGMA_TOKENS_STUDIO_CONFIG } from "./figma-config/index.js";
// ── DTCG I/O helpers (re-exported for advanced consumers) ───────────────────
export {
  defaultTokensDir,
  defaultTokensStudioDir,
  readTokenSets,
  validateDtcgTree,
  writeTokenSet,
} from "./io.js";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { FigmaProvider } from "./providers/figma.js";
export { GitOnlyProvider } from "./providers/git-only.js";
export { MemoryProvider } from "./providers/memory.js";
export { PenpotProvider } from "./providers/penpot.js";
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
} from "./types.js";
// ── Types ───────────────────────────────────────────────────────────────────
export { DesignTokenLeafSchema } from "./types.js";
