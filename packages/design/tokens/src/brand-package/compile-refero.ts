/**
 * Compile Refero DTCG tokens.json (+ optional DESIGN.md) into a Brand Package.
 *
 * Structure:
 *   compile-helpers.ts  — detectPreset, color/font leaf helpers
 *   presets/*           — named fixture builders (linear…notion) + generic
 *   compile-refero.ts   — orchestration only
 *
 * Named fixtures are stress-test carriers (not mood presets). Prefer extending
 * the generic path + DESIGN.md inference over adding one-off hacks.
 */

import { collectColors, collectSurfaces, detectPreset, type Json } from "./compile-helpers";
import { emitBrandCss } from "./emit-css";
import { inferRecipeFromDesignMd } from "./infer-recipe";
import { normalizeBrandPackage } from "./normalize";
import { buildPresetBrand } from "./presets";
import type { BrandPackage, CompileResult } from "./types";

function finish(brand: BrandPackage, warnings: string[]): CompileResult {
  const b = normalizeBrandPackage(brand);
  return { brand: b, css: emitBrandCss(b), warnings };
}

/**
 * Compile a Refero-style DTCG tokens.json (+ optional DESIGN.md text) into a Brand Package.
 * Known fixtures get opinionated recipes; generic brands get solid CTAs.
 */
export function compileReferoTokens(input: {
  tokens: Json;
  id?: string;
  name?: string;
  designMd?: string;
}): CompileResult {
  const warnings: string[] = [];
  const color = (input.tokens.color ?? {}) as Json;
  const surface = (input.tokens.surface ?? {}) as Json;
  const font = (input.tokens.font ?? {}) as Json;
  const radius = (input.tokens.radius ?? {}) as Json;
  const ext = (input.tokens.$extensions ?? {}) as Json;
  const refero = (ext["com.refero.extraction"] ?? {}) as Json;

  const colors = { ...collectColors(color), ...collectSurfaces(surface) };
  const siteName =
    (typeof refero.siteName === "string" && refero.siteName) || input.name || "Custom Brand";
  const id =
    input.id ||
    siteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "custom";

  const preset = detectPreset(id, colors);
  const recipeHints = inferRecipeFromDesignMd(input.designMd ?? "");

  const brand = buildPresetBrand(preset, {
    colors,
    font,
    radius,
    refero,
    recipeHints,
    warnings,
    id,
    siteName,
  });

  return finish(brand, warnings);
}
