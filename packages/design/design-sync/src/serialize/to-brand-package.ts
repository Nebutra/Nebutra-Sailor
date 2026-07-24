/**
 * DTCG token sets (design-sync pull result) → Brand Package.
 *
 * Create Center path:
 *   getDesignSync().pull() → compileBrandFromTokenSets() → applyBrandPackage()
 */

import {
  type BrandPackage,
  type CompileResult,
  compileReferoTokens,
  emitBrandCss,
} from "@nebutra/tokens/brand-package";
import type { DesignTokenSet, DesignTokenTree } from "../types";

export interface ToBrandPackageOptions {
  id?: string;
  name?: string;
  /** Raw DESIGN.md text for recipe inference */
  designMd?: string;
}

function isLeaf(node: unknown): node is { $value: unknown; $type?: string } {
  return Boolean(node && typeof node === "object" && "$value" in (node as object));
}

/** Deep-merge DTCG trees (later sets win on leaf collision). */
export function mergeTokenTrees(trees: DesignTokenTree[]): DesignTokenTree {
  const out: DesignTokenTree = {};
  for (const tree of trees) {
    mergeInto(out, tree);
  }
  return out;
}

function mergeInto(target: DesignTokenTree, source: DesignTokenTree): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (isLeaf(value)) {
      Object.defineProperty(target, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      continue;
    }
    if (value && typeof value === "object") {
      const existing = target[key];
      if (existing && typeof existing === "object" && !isLeaf(existing)) {
        mergeInto(existing as DesignTokenTree, value as DesignTokenTree);
      } else {
        Object.defineProperty(target, key, {
          value: structuredClone(value),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
  }
}

/**
 * Normalize design-sync token sets into the flat Refero-like shape
 * expected by compileReferoTokens (color/font/radius/surface at top level).
 */
export function tokenSetsToReferoShape(sets: DesignTokenSet[]): Record<string, unknown> {
  const merged = mergeTokenTrees(sets.map((s) => s.tokens));
  // If pull already looks like Refero (has color.*), use as-is
  if (merged.color || merged.surface || merged.font) {
    return merged as Record<string, unknown>;
  }
  // design-tokens monorepo shape often nests under themes — still pass through
  return merged as Record<string, unknown>;
}

/** Compile Brand Package + CSS from design-sync pull token sets. */
export function compileBrandFromTokenSets(
  sets: DesignTokenSet[],
  options: ToBrandPackageOptions = {},
): CompileResult {
  const tokens = tokenSetsToReferoShape(sets);
  return compileReferoTokens({
    tokens,
    ...(options.id ? { id: options.id } : {}),
    ...(options.name ? { name: options.name } : {}),
    ...(options.designMd ? { designMd: options.designMd } : {}),
  });
}

/** Convenience: only CSS string */
export function serializeToBrandCss(
  sets: DesignTokenSet[],
  options: ToBrandPackageOptions = {},
): { brand: BrandPackage; css: string; warnings: string[] } {
  const result = compileBrandFromTokenSets(sets, options);
  return {
    brand: result.brand,
    css: result.css || emitBrandCss(result.brand),
    warnings: result.warnings,
  };
}

/**
 * Full Create Center pipeline step after pull:
 *   const { brand, css, warnings } = await pullAndCompileBrand()
 */
export async function pullAndCompileBrand(
  pull: () => Promise<{ sets: DesignTokenSet[] }>,
  options: ToBrandPackageOptions = {},
): Promise<CompileResult> {
  const { sets } = await pull();
  return compileBrandFromTokenSets(sets, options);
}
