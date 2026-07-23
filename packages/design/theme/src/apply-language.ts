/**
 * Runtime design-language switch — Create Center / SaaS global theme swap.
 *
 * Light/dark remains class="dark" on @nebutra/tokens ThemeProvider.
 * Design language is html[data-brand] + Brand Package CSS inject.
 */

import {
  type ApplyBrandOptions,
  applyBrandPackage,
  type BrandPackage,
  clearBrand,
  getActiveBrandId,
  normalizeBrandPackage,
  validateBrandPackage,
} from "@nebutra/tokens/brand-package";
import { type DesignLanguageEntry, getLanguageById } from "./languages";

export type { ApplyBrandOptions };

export interface ApplyLanguageOptions extends ApplyBrandOptions {
  /**
   * Preloaded Brand Package (Create Center compile result).
   * When omitted, only factory / clear is supported from this package
   * without a bundler JSON import — pass `package` for fixtures.
   */
  package?: BrandPackage;
}

/**
 * Apply a design language by id.
 * - `factory` / unknown with no package → clearBrand (tokens SSOT)
 * - with `package` → applyBrandPackage (full carrier swap)
 */
export function applyLanguage(
  languageId: string,
  options: ApplyLanguageOptions = {},
): DesignLanguageEntry | null {
  const entry = getLanguageById(languageId);

  if (!entry || entry.id === "factory" || entry.brandPath == null) {
    if (options.package) {
      const v = validateBrandPackage(options.package);
      if (!v.ok) {
        throw new Error(`Invalid Brand Package: ${v.errors.join("; ")}`);
      }
      applyBrandPackage(normalizeBrandPackage(options.package), options);
      return entry ?? null;
    }
    clearBrand(options);
    return entry ?? getLanguageById("factory") ?? null;
  }

  if (!options.package) {
    throw new Error(
      `Language "${languageId}" requires options.package (Brand Package JSON). ` +
        `Load @nebutra/tokens/${entry.brandPath} or compileReferoTokens(), then applyLanguage("${languageId}", { package }). ` +
        `Or import the single skin CSS: ${entry.install.cssImport ?? "(none)"}.`,
    );
  }

  const v = validateBrandPackage(options.package);
  if (!v.ok) {
    throw new Error(`Invalid Brand Package for ${languageId}: ${v.errors.join("; ")}`);
  }
  const normalized = normalizeBrandPackage({
    ...options.package,
    id: languageId,
  });
  applyBrandPackage(normalized, options);
  return entry;
}

/** Restore factory product chrome (clear data-brand + injected skin). */
export function clearLanguage(options: ApplyBrandOptions = {}): void {
  clearBrand(options);
}

export function getActiveLanguageId(doc?: Document): string {
  return getActiveBrandId(doc) ?? "factory";
}
