/**
 * Preview carrier — the one way the workbench paints a theme onto its artboard.
 *
 * It is the runtime carrier the app already applies, not a second token map:
 *   - design language   → the shipped Brand Package (`getBuiltInBrandPackage`)
 *   - DESIGN.md import  → `compileReferoTokens` (the appearance import path)
 *   - factory/light/dark → no carrier; the artboard inherits the tokens SSOT
 *
 * The CSS comes from `emitBrandCss` in `scoped` mode rooted at the preview
 * artboard, so the emitter that produces `html[data-brand="…"]` for the app
 * produces `.theme-preview-artboard[data-brand="…"]` here. Nothing is
 * re-derived: brand values, fonts, radii, elevation, motion and the neutral
 * ramp all arrive exactly as they do in production, and mode is the canonical
 * `.dark` class the tokens SSOT reads.
 *
 * The workbench used to build an inline `--color-*` style instead. That map
 * duplicated the carrier (fallback palettes, HSL probing) and read a `color`
 * group that mode token sets do not have, so factory previews silently showed
 * stale hardcoded colors.
 */

import { getBuiltInBrandPackage } from "@nebutra/theme/client";
import {
  type BrandPackage,
  compileReferoTokens,
  emitBrandCss,
  validateBrandPackage,
} from "@nebutra/tokens/brand-package";
import {
  type ImportedTokenSetLike,
  importedTokenSetToReferoTokens,
} from "@/components/appearance/apply-imported-brand";

/** The element the preview carrier attaches to (see PreviewCanvas). */
export const PREVIEW_CARRIER_ROOT = ".theme-preview-artboard";

export interface PreviewCarrier {
  /** Scoped carrier CSS; empty when the artboard inherits the tokens SSOT. */
  css: string;
  /** `data-brand` value for the artboard, when a carrier applies. */
  brandId?: string;
  /** Non-fatal compile/validate note, shown next to the preview. */
  warning?: string;
}

const NO_CARRIER: PreviewCarrier = { css: "" };

export function carrierCssForBrand(brand: BrandPackage): string {
  return emitBrandCss(brand, { mode: "scoped", root: PREVIEW_CARRIER_ROOT });
}

/** Design language → shipped Brand Package. Factory / unknown → no carrier. */
export function carrierForLanguage(themeId: string): PreviewCarrier {
  const brand = getBuiltInBrandPackage(themeId);
  if (!brand) return NO_CARRIER;
  return { css: carrierCssForBrand(brand), brandId: themeId };
}

/**
 * DESIGN.md import → Brand Package, exactly as `applyImportedBrandPackage`
 * compiles it for the app. A set that cannot compile leaves the artboard on the
 * factory tokens and reports why.
 */
export function carrierForImported(name: string, tokenSet: ImportedTokenSetLike): PreviewCarrier {
  const tokens = importedTokenSetToReferoTokens(tokenSet);
  if (!tokens.color || Object.keys(tokens.color as object).length === 0) {
    return { css: "", warning: "No color tokens — showing the factory tokens." };
  }

  try {
    // Compiler warnings (heuristic recipe, unknown layout) are import-report
    // material, not preview failures — the carrier only reports why a theme
    // could NOT be applied. The report itself lives in the import panel.
    const { brand } = compileReferoTokens({
      tokens,
      id: "imported",
      name: name || "Imported",
      designMd: "",
    });
    const validation = validateBrandPackage(brand);
    if (!validation.ok) {
      return {
        css: "",
        warning: `Brand Package invalid — showing the factory tokens: ${validation.errors.join("; ")}`,
      };
    }
    return { css: carrierCssForBrand(brand), brandId: "imported" };
  } catch (error) {
    return {
      css: "",
      warning: `Could not compile the imported theme — showing the factory tokens: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
