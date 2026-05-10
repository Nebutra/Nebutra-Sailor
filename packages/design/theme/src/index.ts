// packages/design/theme/src/index.ts
// Re-export next-themes for convenience — all apps import from @nebutra/theme

export type { ThemeProviderProps } from "next-themes";
export { ThemeProvider, useTheme } from "next-themes";

// Theme IDs must match [data-theme] selectors in themes.css
export const THEME_IDS = ["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean"] as const;

export type ThemeId = (typeof THEME_IDS)[number];
