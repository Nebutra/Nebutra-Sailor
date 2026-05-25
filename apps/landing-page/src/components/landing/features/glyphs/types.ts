import type { ComponentType } from "react";
import type { SerializablePackageFeatureEntry } from "../package-feature-data";

/**
 * Per-subpackage mini-visual ("glyph") component contract.
 *
 * A glyph is a small, specifically-designed thumbnail (~160-180px tall)
 * that hints at what the sub-package does. It sits inside the parent
 * group's sub-package card grid above the title/desc/CTA, replacing the
 * generic "Icon + slug" identity row when available.
 *
 * Each glyph is bespoke — designed for its specific sub-package — and
 * composed of @nebutra/ui primitives. No hand-rolled SVG geometry.
 */
export type SubpackageGlyphProps = {
  /** The sub-package entry — plain data only because many glyphs are Client Components. */
  entry: SerializablePackageFeatureEntry;
  /** UI locale. */
  locale: "en" | "zh";
};

export type SubpackageGlyph = ComponentType<SubpackageGlyphProps>;
