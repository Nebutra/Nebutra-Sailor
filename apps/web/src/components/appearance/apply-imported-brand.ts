/**
 * Apply an Appearance DESIGN.md import via the Brand Package carrier path
 * (compileReferoTokens → applyBrandPackage), not partial --color-* HSL probes.
 *
 * Falls back to null when the token set cannot produce a valid package so the
 * caller can keep the legacy preview-style path.
 */

import {
  applyBrandPackage,
  type BrandPackage,
  compileReferoTokens,
  normalizeBrandPackage,
  validateBrandPackage,
} from "@nebutra/tokens/brand-package";

type DtcgLeaf = { $value?: string; $type?: string };

export type ImportedTokenSetLike = {
  color?: Record<string, DtcgLeaf | undefined>;
  radius?: Record<string, DtcgLeaf | undefined>;
  fontFamily?: Record<string, DtcgLeaf | undefined>;
  fontSize?: Record<string, DtcgLeaf | undefined>;
  shadow?: Record<string, DtcgLeaf | undefined>;
};

function leafMap(
  group: Record<string, DtcgLeaf | undefined> | undefined,
  type: string,
): Record<string, { $value: string; $type: string }> {
  const out: Record<string, { $value: string; $type: string }> = {};
  if (!group) return out;
  for (const [key, leaf] of Object.entries(group)) {
    if (leaf?.$value != null && typeof leaf.$value === "string") {
      out[key] = { $value: leaf.$value, $type: leaf.$type ?? type };
    }
  }
  return out;
}

/** Map Appearance / playground ThemeTokenSet → Refero-ish shape for compile. */
export function importedTokenSetToReferoTokens(
  tokenSet: ImportedTokenSetLike,
): Record<string, unknown> {
  const color = leafMap(tokenSet.color, "color");
  const radius = leafMap(tokenSet.radius, "dimension");
  const font = leafMap(tokenSet.fontFamily, "fontFamily");
  const tokens: Record<string, unknown> = {};
  if (Object.keys(color).length) tokens.color = color;
  if (Object.keys(radius).length) tokens.radius = radius;
  if (Object.keys(font).length) tokens.font = font;
  return tokens;
}

export interface ApplyImportedBrandResult {
  ok: boolean;
  brand?: BrandPackage;
  warnings: string[];
  error?: string;
}

/**
 * Compile + apply imported DESIGN.md token groups as a Brand Package skin.
 * Uses id `imported` so it does not collide with catalog languages.
 */
export function applyImportedBrandPackage(
  name: string,
  tokenSet: ImportedTokenSetLike,
  designMd?: string,
): ApplyImportedBrandResult {
  const tokens = importedTokenSetToReferoTokens(tokenSet);
  if (!tokens.color || Object.keys(tokens.color as object).length === 0) {
    return { ok: false, warnings: [], error: "no color tokens" };
  }

  try {
    const { brand, warnings } = compileReferoTokens({
      tokens,
      id: "imported",
      name: name || "Imported",
      designMd: designMd ?? "",
    });
    const v = validateBrandPackage(brand);
    if (!v.ok) {
      return { ok: false, warnings: [...warnings, ...v.errors], error: v.errors.join("; ") };
    }
    const normalized = normalizeBrandPackage(brand);
    applyBrandPackage(normalized);
    return { ok: true, brand: normalized, warnings };
  } catch (e) {
    return {
      ok: false,
      warnings: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
