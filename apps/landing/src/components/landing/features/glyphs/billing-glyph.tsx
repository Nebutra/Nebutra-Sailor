"use client";

import { ChartTrendingUp, CreditCard, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

// Demo figures and the provider name — same on every locale.
const AMOUNT = "$12,400";
const TREND = "+12%";
const PROVIDER = "Creem";

type BillingCopy = { label: string; status: string };

// Sparkline bar heights as percentages (subtly ascending to reinforce growth).
const BAR_HEIGHTS = [32, 44, 38, 56, 48, 70, 84] as const;

export function BillingGlyph({ copy: rawCopy }: SubpackageGlyphProps) {
  const copy = rawCopy as BillingCopy;

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-border shadow-sm">
        {/* Header: MRR label + sparkle accent */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-muted-foreground" />
          <span className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {copy.label}
          </span>
        </div>

        {/* Big number + trend chip */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{AMOUNT}</span>
          <Badge variant="green-subtle" size="sm" icon={<ChartTrendingUp />}>
            {TREND}
          </Badge>
        </div>

        {/* Sparkline: 7 bars, primary tint, varying heights */}
        <div className="flex h-7 items-end gap-1">
          {BAR_HEIGHTS.map((height, i) => (
            <span
              key={i}
              className="flex-1 rounded-[var(--radius-sm)] bg-primary"
              style={{ height: `${height}%`, opacity: 0.35 + (i / BAR_HEIGHTS.length) * 0.6 }}
            />
          ))}
        </div>

        {/* Footer: provider chip with credit card icon */}
        <div className="mt-0.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            {PROVIDER} · {copy.status}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
        </div>
      </div>
    </div>
  );
}
