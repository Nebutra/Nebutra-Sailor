/**
 * FROZEN empty mood-catalog shim — do not extend.
 *
 * Multi-mood oklch catalog was removed. Use `@nebutra/theme/languages`.
 * Package export `@nebutra/theme/registry` was removed; this file stays for
 * internal tests of the empty frozen contract only.
 *
 * @deprecated Prefer LANGUAGE_REGISTRY / isLanguageId.
 */

import { DEFAULT_LANGUAGE, isLanguageId, LANGUAGE_IDS, LANGUAGE_REGISTRY } from "./languages";
import registryJson from "./registry.json" with { type: "json" };

export interface ThemeRegistry {
  $schema: string;
  version: string;
  defaultTheme: string;
  /** Always empty — frozen mood list */
  themes: { id: string }[];
  notes?: string;
}

/** Always empty — frozen. */
export const THEME_REGISTRY = registryJson as ThemeRegistry;
/** Always empty. */
export const THEME_IDS: string[] = [];
/** @deprecated Always empty — use LANGUAGE_IDS from @nebutra/theme/languages */
export const BUILT_IN_THEME_IDS = THEME_IDS;
export const DEFAULT_THEME = DEFAULT_LANGUAGE;

export type ThemeId = string;

export function isBuiltInThemeId(id: string): boolean {
  return isLanguageId(id);
}

/** Accepts design-language ids or "custom". */
export function isThemeId(id: string): boolean {
  return id === "custom" || isLanguageId(id);
}

export { DEFAULT_LANGUAGE, LANGUAGE_IDS, LANGUAGE_REGISTRY };
