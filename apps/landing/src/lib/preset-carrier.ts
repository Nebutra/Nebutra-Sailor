/**
 * Preset carrier — the one way a preset is painted onto a page without a
 * rebuild: Sailor Studio's artboard and catalog frame, and a template site
 * running with NEXT_PUBLIC_PRESET_PREVIEW (components/preset-preview.tsx).
 *
 * It is the same resolver and emitter the project build uses, not a second
 * token map: the preset is resolved over its base language
 * (`@nebutra/tokens/preset` — the shipped Brand Package, or the House tokens
 * for factory) and emitted by `emitBrandCss` in `scoped` mode rooted at the
 * artboard. So what the artboard shows is what `nebutra apply --preset` puts
 * in project.css, and mode is the canonical `.dark` class the tokens read.
 */
import { getBuiltInBrandPackage } from "@nebutra/theme/client";
import { type BrandPackage, emitBrandCss } from "@nebutra/tokens/brand-package";
import { factoryBrandPackage, type Preset, resolvePreset } from "@nebutra/tokens/preset";

/** The `data-brand` a carrier paints under (html on the preview site, the artboard in Studio). */
export const PRESET_PREVIEW_BRAND = "studio";

/** The element the preview carrier attaches to (see PreviewCanvas). */
export const PREVIEW_CARRIER_ROOT = ".theme-preview-artboard";

export interface PreviewCarrier {
  /** Scoped carrier CSS; empty when the artboard inherits the House tokens. */
  css: string;
  /** `data-brand` value for the artboard, when a carrier applies. */
  brandId?: string;
  /** A knob the base cannot honour, shown next to the preview. */
  warning?: string;
}

const NO_CARRIER: PreviewCarrier = { css: "" };

export function carrierCssForBrand(brand: BrandPackage, root = PREVIEW_CARRIER_ROOT): string {
  return emitBrandCss(brand, { mode: "scoped", root });
}

const isPlainFactory = (p: Preset) => p.base === "factory" && Object.keys(p).length === 1;

/**
 * A preset → the scoped carrier. Plain factory paints nothing: the artboard
 * inherits the House. `root` is the element that carries `data-brand` — the
 * artboard, or `html` inside the catalog frame, where overlays portal to body.
 */
export function carrierForPreset(preset: Preset, root = PREVIEW_CARRIER_ROOT): PreviewCarrier {
  if (isPlainFactory(preset)) return NO_CARRIER;
  const base =
    preset.base === "factory" ? factoryBrandPackage() : getBuiltInBrandPackage(preset.base);
  if (!base) return { css: "", warning: `${preset.base} is not a built-in language.` };
  const { brand, warnings } = resolvePreset(preset, base, { id: "studio", name: "Studio" });
  const carrier: PreviewCarrier = {
    css: carrierCssForBrand(brand, root),
    brandId: PRESET_PREVIEW_BRAND,
  };
  if (warnings[0]) carrier.warning = warnings[0];
  return carrier;
}
