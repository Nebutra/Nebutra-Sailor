// =============================================================================
// Tokens Studio config — canonical copy owned by @nebutra/design-sync
// =============================================================================
// The original `.tokens-studio/config.json` lives at the repo root because the
// Tokens Studio plugin pins its config-discovery path. We keep an in-package
// canonical copy here so the figma provider can self-document and so a sync
// CLI can scaffold the file when initialising a fresh repo.
//
// If the plugin's config schema changes, update both files in lock-step.
// =============================================================================

import figmaPluginConfig from "./tokens-studio.config.json" with { type: "json" };

export const FIGMA_TOKENS_STUDIO_CONFIG = figmaPluginConfig;

export type FigmaTokensStudioConfig = typeof figmaPluginConfig;
