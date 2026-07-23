/**
 * Light/dark mode token sets only.
 *
 * Multi-mood oklch community themes (crimson-*, azure-*, …) were removed —
 * product chrome swap is Brand Package design languages on @nebutra/theme.
 */
import coreTokens from "./tokens/core.json";
import semanticTokens from "./tokens/semantic.json";
import darkTokens from "./tokens/themes/dark.json";
import lightTokens from "./tokens/themes/light.json";

export const BASE_TOKEN_SETS = {
  core: coreTokens,
  semantic: semanticTokens,
} as const;

/** @deprecated Empty — use @nebutra/theme LANGUAGE_REGISTRY + Brand Packages */
export const THEME_TOKEN_SETS = {} as const;

export const MODE_TOKEN_SETS = {
  light: lightTokens,
  dark: darkTokens,
} as const;

export type ThemeTokenSetId = never;
export type ModeTokenSetId = keyof typeof MODE_TOKEN_SETS;
