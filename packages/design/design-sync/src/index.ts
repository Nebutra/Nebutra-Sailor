// =============================================================================
// @nebutra/design-sync — Provider-agnostic design-tool sync
// =============================================================================
// Supports:
//   - git-only                (zero-config default — DTCG files only)
//   - memory                  (test fixture)
//   - design-md               (AI-native DESIGN.md, markdown + YAML front matter)
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
// ── DTCG I/O helpers (re-exported for advanced consumers) ───────────────────
export {
  defaultTokensDir,
  defaultTokensStudioDir,
  readTokenSets,
  validateDtcgTree,
  writeTokenSet,
} from "./io";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
// NOTE: DesignMdProvider is type-only at the root so importing this package
// never eagerly loads the alpha @google/design.md linter (which is 655 KB and
// statically imported in from-design-md.ts).  Get the runtime class via the
// `@nebutra/design-sync/design-md` subpath or `createDesignSync({ provider:
// 'design-md' })`, both of which are already lazy/dynamic.  The sibling
// providers below are value-exported because they carry no such heavyweight
// static dependency.
export type { DesignMdProvider } from "./providers/design-md";
export { GitOnlyProvider } from "./providers/git-only";
export { MemoryProvider } from "./providers/memory";
// ── DTCG → Brand Package (Create Center) ───────────────────────────────────
export {
  compileBrandFromTokenSets,
  mergeTokenTrees,
  pullAndCompileBrand,
  serializeToBrandCss,
  type ToBrandPackageOptions,
  tokenSetsToReferoShape,
} from "./serialize/to-brand-package";
// ── DTCG → DESIGN.md serializer ────────────────────────────────────────────
export { serializeToDesignMd, type ToDesignMdOptions } from "./serialize/to-design-md";
// ── DTCG → preview.html serializer ─────────────────────────────────────────
export {
  serializeToPreviewHtml,
  type ToPreviewHtmlOptions,
} from "./serialize/to-preview-html";
export type {
  BaseProviderConfig,
  DesignMdProviderConfig,
  DesignSyncConfig,
  DesignSyncProvider,
  DesignSyncProviderType,
  DesignTokenLeaf,
  DesignTokenSet,
  DesignTokenTree,
  GitOnlyProviderConfig,
  HealthStatus,
  MemoryProviderConfig,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "./types";
// ── Types ───────────────────────────────────────────────────────────────────
export { DesignTokenLeafSchema } from "./types";
