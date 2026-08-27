"use client";

import { BlendMode, Droplet, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * BrandGenesisGlyph
 *
 * Showcase for the AI brand-identity generator sub-package. Renders a
 * compact "AI-generated brand kit" card: a 5-swatch oklch palette row
 * (purple -> blue -> cyan -> teal -> mint), a typography pairing row,
 * and two candidate taglines. Top-right badge mimics the generator's
 * latency stamp, footer names the AI provenance.
 */

type Swatch = {
  name: string;
  background: string;
};

const SWATCHES: ReadonlyArray<Swatch> = [
  { name: "p1", background: "oklch(0.62 0.22 305)" },
  { name: "p2", background: "oklch(0.62 0.22 265)" },
  { name: "p3", background: "oklch(0.72 0.18 215)" },
  { name: "p4", background: "oklch(0.78 0.15 185)" },
  { name: "p5", background: "oklch(0.85 0.13 160)" },
];

const TAGLINES: ReadonlyArray<string> = ["Make work flow", "Calm power"];

export function BrandGenesisGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-lg)] bg-muted px-3 py-2"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Droplet className="h-3 w-3" />
          brand-genesis &middot; ai
        </span>
        <Badge variant="outline" size="sm" className="font-mono text-[9px]">
          generated &middot; 12s
        </Badge>
      </div>

      {/* 5-swatch oklch palette row */}
      <ul className="flex min-h-0 gap-1">
        {SWATCHES.map((swatch) => (
          <li
            key={swatch.name}
            className="flex h-7 flex-1 items-center justify-center rounded-[var(--radius-md)]"
            style={{ background: swatch.background }}
          >
            <span
              className="font-mono text-[8px] uppercase tracking-wide"
              style={{ color: "#ffffff" }}
            >
              {swatch.name}
            </span>
          </li>
        ))}
      </ul>

      {/* Typography pairing */}
      <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-background px-2 py-1">
        <span className="text-[13px] font-bold tracking-tight text-foreground">Aria Display</span>
        <span className="font-mono text-[9px] text-muted-foreground">+</span>
        <span className="text-[12px] font-normal text-foreground">Inter Sans</span>
      </div>

      {/* Taglines */}
      <ul className="flex flex-1 flex-col justify-center gap-1">
        {TAGLINES.map((tagline) => (
          <li
            key={tagline}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-background px-2 py-0.5"
          >
            <span className="h-1 w-1 rounded-full" style={{ background: "hsl(var(--primary))" }} />
            <span className="text-[10px] italic text-foreground">{tagline}</span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <p className="flex items-center justify-center gap-1 font-mono text-[9px] text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        AI brand kit &middot; 5 variations
        <BlendMode className="ml-1 h-3 w-3" />
      </p>
    </div>
  );
}
