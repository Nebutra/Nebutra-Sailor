import registryJson from "./registry.json" with { type: "json" };

export interface ThemeRegistryInstall {
  command: string;
  registryUrl: string;
}

export interface ThemeRegistryCompatibility {
  tailwind: "4";
  cssVariables: boolean;
  figmaVariables: boolean;
  shadcnRegistry: boolean;
}

export interface ThemeRegistryGovernance {
  wcag: "AA" | "AAA";
  requiredTokens: string[];
  visualSuites: string[];
}

export interface ThemeRegistryEntry {
  id: string;
  name: string;
  category: string;
  mood: string;
  tokenPath: string;
  install: ThemeRegistryInstall;
  compatibility: ThemeRegistryCompatibility;
  governance: ThemeRegistryGovernance;
}

export interface ThemeRegistry {
  $schema: string;
  version: string;
  defaultTheme: string;
  themes: ThemeRegistryEntry[];
}

export const THEME_REGISTRY = registryJson as ThemeRegistry;
export const THEME_IDS = THEME_REGISTRY.themes.map((theme) => theme.id);
export const BUILT_IN_THEME_IDS = THEME_IDS;
export const DEFAULT_THEME = THEME_REGISTRY.defaultTheme;

export type ThemeId = string;

export function isBuiltInThemeId(id: string): boolean {
  return THEME_IDS.includes(id);
}

export function isThemeId(id: string): boolean {
  return id === "custom" || isBuiltInThemeId(id);
}

export function getThemeById(id: string): ThemeRegistryEntry | undefined {
  return THEME_REGISTRY.themes.find((theme) => theme.id === id);
}
