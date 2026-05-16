// packages/design/theme/src/index.ts
// Re-export next-themes for convenience — all apps import from @nebutra/theme.
// Theme catalog metadata lives in ./registry so CLI/preset/docs/Figma sync all
// discover the same built-in theme contract.

export type { ThemeProviderProps } from "next-themes";
export { ThemeProvider, useTheme } from "next-themes";

export {
  BUILT_IN_THEME_IDS,
  DEFAULT_THEME,
  getThemeById,
  isBuiltInThemeId,
  isThemeId,
  THEME_IDS,
  THEME_REGISTRY,
  type ThemeId,
  type ThemeRegistry,
  type ThemeRegistryEntry,
} from "./registry";
