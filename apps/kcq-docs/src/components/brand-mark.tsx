import type { CSSProperties } from "react";
import brand from "@/generated/brand.json";

/**
 * The KCQ lockup: the candle glyph in Cobalt and the KLineChartQuant wordmark (Outfit 600,
 * ADR 0001) as vector outlines generated from the font. The outline is one cached SVG drawn as a
 * CSS mask in currentColor, so it follows the theme and no display face loads. Never translated.
 */
export function BrandMark() {
  const word = {
    "--kcq-wordmark": `url("${brand.wordmark}")`,
    aspectRatio: `${brand.width} / ${brand.height}`,
  } as CSSProperties;
  return (
    <span className="kcq-brand" translate="no">
      <svg
        className="kcq-brand-glyph"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        aria-hidden="true"
        focusable="false"
      >
        <path d={brand.glyph} />
      </svg>
      <span className="kcq-brand-word" style={word} role="img" aria-label="KLineChartQuant" />
    </span>
  );
}
