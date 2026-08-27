import { BlendMode, Droplet } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

/**
 * Tokens glyph — runtime CSS variables single source of truth.
 *
 * Top: 12-step horizontal color scale (thin rectangles) showing the
 * blue-scale token ramp. Bottom: 2 chip rows naming key tokens with
 * their actual swatches/radius previews.
 */

const COLOR_SCALE_STEPS = [
  "var(--blue-1)",
  "var(--blue-2)",
  "var(--blue-3)",
  "var(--blue-4)",
  "var(--blue-5)",
  "var(--blue-6)",
  "var(--blue-7)",
  "var(--blue-8)",
  "hsl(var(--primary))",
  "var(--blue-10)",
  "var(--blue-11)",
  "var(--blue-12)",
] as const;

type ColorChip = {
  name: string;
  swatch: string;
  isGradient?: boolean;
};

const COLOR_CHIPS: ReadonlyArray<ColorChip> = [
  { name: "--brand-primary", swatch: "hsl(var(--primary))" },
  { name: "--brand-accent", swatch: "var(--brand-accent)" },
  { name: "--brand-gradient", swatch: "hsl(var(--primary))", isGradient: true },
];

type RadiusChip = {
  name: string;
  radius: string;
};

const RADIUS_CHIPS: ReadonlyArray<RadiusChip> = [
  { name: "--radius-sm", radius: "4px" },
  { name: "--radius-md", radius: "6px" },
  { name: "--radius-lg", radius: "10px" },
];

export function TokensGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <Badge variant="outline" className="text-[10px] font-normal">
          <Droplet className="mr-1 h-2.5 w-2.5" />
          12-step
        </Badge>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
        <BlendMode className="h-3 w-3" />
        <span>--blue-1 → --blue-12</span>
      </div>

      <div className="flex h-4 w-full overflow-hidden rounded-[var(--radius-sm)] border border-border">
        {COLOR_SCALE_STEPS.map((color, idx) => (
          <div
            key={`step-${idx}`}
            role="img"
            aria-label={`blue-${idx + 1}`}
            className="h-full flex-1"
            style={{ background: color }}
          />
        ))}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {COLOR_CHIPS.map((chip) => (
          <div
            key={chip.name}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5"
          >
            <span
              className="h-2.5 w-2.5 rounded-[var(--radius-sm)] border border-border"
              style={{ background: chip.swatch }}
            />
            <span className="text-[9px] font-mono text-muted-foreground">{chip.name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {RADIUS_CHIPS.map((chip) => (
          <div
            key={chip.name}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5"
          >
            <span
              className="h-2.5 w-2.5 border border-border bg-muted"
              style={{ borderRadius: chip.radius }}
            />
            <span className="text-[9px] font-mono text-muted-foreground">{chip.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto text-[9px] font-mono text-muted-foreground">
        runtime CSS vars · @import &quot;@nebutra/tokens/styles.css&quot;
      </div>
    </div>
  );
}
