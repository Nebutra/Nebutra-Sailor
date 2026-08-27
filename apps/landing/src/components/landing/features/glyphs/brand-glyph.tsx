"use client";

import { BlendMode, Droplet } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * BrandGlyph
 *
 * Showcase for the @nebutra/brand sub-package — surfaces the brand primitives:
 * 6 swatches (blue / cyan / gradient / success / warning / danger), three
 * typography samples (display / regular / mono), and a footer naming the
 * underlying token pipeline.
 */

type Swatch = {
  name: string;
  background: string;
  textColor?: string;
};

const SWATCHES: ReadonlyArray<Swatch> = [
  { name: "blue", background: "hsl(var(--primary))" },
  { name: "cyan", background: "var(--brand-accent)", textColor: "hsl(var(--foreground))" },
  { name: "grad", background: "hsl(var(--primary))" },
  { name: "ok", background: "var(--status-success)" },
  { name: "warn", background: "var(--status-warning)", textColor: "hsl(var(--foreground))" },
  { name: "err", background: "var(--status-danger)" },
];

type TypeSample = {
  label: string;
  className: string;
};

const TYPE_SAMPLES: ReadonlyArray<TypeSample> = [
  { label: "Aa", className: "font-bold text-[18px] tracking-tight" },
  { label: "Aa", className: "font-normal text-[16px]" },
  { label: "Aa", className: "font-mono text-[14px]" },
];

export function BrandGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-lg)] bg-muted px-3 py-2"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Droplet className="h-3 w-3" />
          brand &middot; tokens
        </span>
        <Badge variant="outline" size="sm" className="font-mono text-[9px]">
          design
        </Badge>
      </div>

      {/* 6 brand swatches in a row */}
      <ul className="flex min-h-0 gap-1">
        {SWATCHES.map((swatch) => (
          <li
            key={swatch.name}
            className="flex h-7 flex-1 items-center justify-center rounded-[var(--radius-md)]"
            style={{ background: swatch.background }}
          >
            <span
              className="font-mono text-[8px] uppercase tracking-wide"
              style={{ color: swatch.textColor ?? "#ffffff" }}
            >
              {swatch.name}
            </span>
          </li>
        ))}
      </ul>

      {/* Typography samples */}
      <div className="flex flex-1 items-center justify-around rounded-[var(--radius-md)] bg-background px-2">
        {TYPE_SAMPLES.map((sample, idx) => (
          <span
            key={sample.className}
            className={`${sample.className} text-foreground`}
            style={
              idx === 0
                ? {
                    background: "hsl(var(--primary))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }
                : undefined
            }
          >
            {sample.label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <p className="flex items-center justify-center gap-1 font-mono text-[9px] text-muted-foreground">
        <BlendMode className="h-3 w-3" />
        oklch &middot; DTCG &middot; Style Dictionary
      </p>
    </div>
  );
}
