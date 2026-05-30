import darkTokens from "./tokens/themes/dark.json";
import darkDenseTokens from "./tokens/themes/dark-dense.json";
import lightTokens from "./tokens/themes/light.json";
import minimalTokens from "./tokens/themes/minimal.json";
import nebutraTokens from "./tokens/themes/nebutra.json";
import oceanTokens from "./tokens/themes/ocean.json";
import vibrantTokens from "./tokens/themes/vibrant.json";

export const THEME_TOKEN_SETS = {
  nebutra: nebutraTokens,
  "dark-dense": darkDenseTokens,
  minimal: minimalTokens,
  vibrant: vibrantTokens,
  ocean: oceanTokens,
} as const;

export const MODE_TOKEN_SETS = {
  light: lightTokens,
  dark: darkTokens,
} as const;

export type ThemeTokenSetId = keyof typeof THEME_TOKEN_SETS;
export type ModeTokenSetId = keyof typeof MODE_TOKEN_SETS;
