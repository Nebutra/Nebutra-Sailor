"use client";

import { ChartTrendingUp, CreditCard, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    label: "Monthly Recurring Revenue",
    amount: "$12,400",
    trend: "+12%",
    provider: "Stripe",
    status: "live",
  },
  zh: {
    label: "月度经常性收入",
    amount: "$12,400",
    trend: "+12%",
    provider: "Stripe",
    status: "在线",
  },
} as const;

// Sparkline bar heights as percentages (subtly ascending to reinforce growth).
const BAR_HEIGHTS = [32, 44, 38, 56, 48, 70, 84] as const;

export function BillingGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Header: MRR label + sparkle accent */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-muted-foreground" />
          <span className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {copy.label}
          </span>
        </div>

        {/* Big number + trend chip */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{copy.amount}</span>
          <Badge variant="green-subtle" size="sm" icon={<ChartTrendingUp />}>
            {copy.trend}
          </Badge>
        </div>

        {/* Sparkline: 7 bars, primary tint, varying heights */}
        <div className="flex h-7 items-end gap-1">
          {BAR_HEIGHTS.map((height, i) => (
            <span
              key={i}
              className="flex-1 rounded-[var(--radius-sm)] bg-[hsl(var(--primary))]"
              style={{ height: `${height}%`, opacity: 0.35 + (i / BAR_HEIGHTS.length) * 0.6 }}
            />
          ))}
        </div>

        {/* Footer: provider chip with credit card icon */}
        <div className="mt-0.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            {copy.provider} · {copy.status}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
        </div>
      </div>
    </div>
  );
}
