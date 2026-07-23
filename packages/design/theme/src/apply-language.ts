/**
 * Runtime design-language switch — Create Center / SaaS global theme swap.
 *
 * Light/dark remains class="dark" on @nebutra/tokens ThemeProvider.
 * Design language is html[data-brand] + Brand Package CSS inject.
 *
 * Built-in languages load Brand Packages automatically; pass `package` only for
 * custom / compile-time packages (Create Center preview).
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
import { getBuiltInBrandPackage } from "./built-in-packages";
import { type DesignLanguageEntry, getLanguageById } from "./languages";

export type { ApplyBrandOptions };

export interface ApplyLanguageOptions extends ApplyBrandOptions {
  /**
   * Preloaded Brand Package (Create Center compile result or override).
   * When omitted, built-in languages resolve from brands/<id>/brand.json.
   */
  package?: BrandPackage;
}

/**
 * Apply a design language by id.
 * - `factory` / unknown without package → clearBrand (tokens SSOT)
 * - built-in id without package → load shipped Brand Package
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

  const pkg = options.package ?? getBuiltInBrandPackage(languageId);
  if (!pkg) {
    throw new Error(
      `Language "${languageId}" has no built-in Brand Package and no options.package. ` +
        `Load @nebutra/tokens/${entry.brandPath} or compileReferoTokens(), then ` +
        `applyLanguage("${languageId}", { package }). ` +
        `Or import the single skin CSS: ${entry.install.cssImport ?? "(none)"}.`,
    );
  }

  const v = validateBrandPackage(pkg);
  if (!v.ok) {
    throw new Error(`Invalid Brand Package for ${languageId}: ${v.errors.join("; ")}`);
  }
  const normalized = normalizeBrandPackage({
    ...pkg,
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
