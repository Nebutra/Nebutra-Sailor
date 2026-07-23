/**
 * Compatibility shim for `@nebutra/theme/registry`.
 *
 * Multi-mood oklch catalog was **removed**. Callers should migrate to
 * `LANGUAGE_REGISTRY` / `@nebutra/theme/languages`.
 *
 * This module still exports empty THEME_IDS so old imports typecheck;
 * isThemeId only accepts "custom" (and empty built-ins).
 *
 * Prefer design languages for product chrome swap.
 */

import {
  DEFAULT_LANGUAGE,
  type DesignLanguageEntry,
  getLanguageById,
  isLanguageId,
  LANGUAGE_IDS,
  LANGUAGE_REGISTRY,
} from "./languages";
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
  notes?: string;
}

/** @deprecated Empty mood list — use LANGUAGE_REGISTRY */
export const THEME_REGISTRY = registryJson as ThemeRegistry;
/** @deprecated Empty */
export const THEME_IDS = THEME_REGISTRY.themes.map((theme) => theme.id);
/** @deprecated Empty */
export const BUILT_IN_THEME_IDS = THEME_IDS;
/** Defaults to design-language factory */
export const DEFAULT_THEME = DEFAULT_LANGUAGE;

export type ThemeId = string;

export function isBuiltInThemeId(id: string): boolean {
  // Bridge: accept design language ids as the only "built-in themes"
  return isLanguageId(id);
}

export function isThemeId(id: string): boolean {
  return id === "custom" || isLanguageId(id);
}

/**
 * @deprecated Prefer getLanguageById.
 * Returns a compatibility projection of a design language as a ThemeRegistryEntry.
 */
export function getThemeById(id: string): ThemeRegistryEntry | undefined {
  const lang = getLanguageById(id);
  if (!lang) return undefined;
  return languageToLegacyEntry(lang);
}

function languageToLegacyEntry(lang: DesignLanguageEntry): ThemeRegistryEntry {
  return {
    id: lang.id,
    name: lang.name,
    category: "design-language",
    mood: lang.description,
    tokenPath: lang.brandPath ?? "(factory)",
    install: {
      command: lang.install.command,
      registryUrl: `https://ui.nebutra.com/languages/${lang.id}.json`,
    },
    compatibility: {
      tailwind: "4",
      cssVariables: true,
      figmaVariables: true,
      shadcnRegistry: true,
    },
    governance: {
      wcag: "AA",
      requiredTokens: ["roles.action", "roles.canvas", "recipe.buttonDefault"],
      visualSuites: lang.proves,
    },
  };
}

/** Project design languages into legacy ThemeRegistryEntry shape for UI that still expects it. */
export function listThemesAsLegacyEntries(): ThemeRegistryEntry[] {
  return LANGUAGE_REGISTRY.languages.map(languageToLegacyEntry);
}

export { DEFAULT_LANGUAGE, LANGUAGE_IDS, LANGUAGE_REGISTRY };
