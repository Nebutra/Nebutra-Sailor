"use client";

import { BlendMode, Code, Droplet } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * DesignTokensGlyph
 *
 * W3C DTCG token preview. Header names the source file + spec version.
 * A compact 6-line JSON snippet shows one `color.brand.primary` token with
 * `$value` / `$type` keys. A swatch row reflects the three referenced
 * tokens (brand primary, brand accent, status success). Footer signals the
 * Style Dictionary 4 multi-platform output pipeline.
 */

type Swatch = {
  token: string;
  color: string;
};

const SWATCHES: ReadonlyArray<Swatch> = [
  { token: "brand.primary", color: "var(--brand-primary)" },
  { token: "brand.accent", color: "var(--brand-accent)" },
  { token: "status.success", color: "var(--status-success)" },
];

export function DesignTokensGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-2"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--neutral-11)]">
          <Code className="h-3 w-3" />
          tokens.json
        </span>
        <Badge
          variant="secondary"
          size="sm"
          className="bg-[var(--blue-3)] font-mono text-[9px] text-[var(--blue-11)]"
        >
          DTCG v0.7
        </Badge>
      </div>

      {/* DTCG JSON snippet */}
      <pre className="m-0 flex-1 overflow-hidden rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-2 py-1 font-mono text-[9px] leading-[1.35] text-[var(--neutral-12)]">
        <code>
          {`{
  "color.brand.primary": {
    "$value": "#0033FE",
    "$type": "color"
  }
}`}
        </code>
      </pre>

      {/* Swatch row */}
      <ul className="flex items-center justify-between gap-1.5 rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-2 py-1">
        {SWATCHES.map((swatch) => (
          <li key={swatch.token} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full ring-1 ring-[var(--neutral-7)]"
              style={{ backgroundColor: swatch.color }}
            />
            <span className="min-w-0 truncate font-mono text-[9px] text-[var(--neutral-11)]">
              {swatch.token}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <p className="flex items-center justify-center gap-1 font-mono text-[9px] text-[var(--neutral-11)]">
        <BlendMode className="h-2.5 w-2.5" />
        Style Dictionary 4<span aria-hidden="true">&middot;</span>
        <Droplet className="h-2.5 w-2.5" />
        multi-platform output
      </p>
    </div>
  );
}
