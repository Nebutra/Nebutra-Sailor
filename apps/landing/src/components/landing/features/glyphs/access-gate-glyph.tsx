"use client";

import { Lightning, LockClosed, Sparkles } from "@nebutra/icons";
import { Badge, Button } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * AccessGateGlyph — mini paywall / entitlement gate card.
 *
 * Locked premium feature with blurred content placeholders and an
 * "Unlock with Pro" CTA. Visual hint: gated content behind a tier
 * requirement, footed by the entitlement check expression.
 */

const COPY = {
  en: {
    feature: "Advanced analytics",
    cta: "Unlock with Pro",
    tier: "Pro · $29/mo",
    footer: "requireEntitlement('analytics:advanced')",
  },
  zh: {
    feature: "高级分析",
    cta: "升级 Pro 解锁",
    tier: "Pro · $29/月",
    footer: "requireEntitlement('analytics:advanced')",
  },
} as const;

const BAR_WIDTHS = ["78%", "92%", "64%"] as const;

export function AccessGateGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      {/* Header: feature title + lock */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
          <span className="truncate text-[11px] font-semibold text-foreground">{t.feature}</span>
        </div>
        <LockClosed className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Blurred content placeholder bars */}
      <div
        className="flex flex-1 flex-col justify-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-border bg-background px-2.5 py-2"
        role="img"
        aria-label="Locked content"
      >
        {BAR_WIDTHS.map((width, i) => (
          <div
            key={width}
            className="h-1.5 rounded-full bg-muted"
            style={{
              width,
              filter: "blur(1.5px)",
              opacity: 0.7 - i * 0.1,
            }}
          />
        ))}
      </div>

      {/* CTA row: unlock button + tier badge */}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ink" size="sm" className="h-6 gap-1 px-2 text-[10px]">
          <Lightning className="h-2.5 w-2.5" aria-hidden="true" />
          {t.cta}
        </Button>
        <Badge variant="blue-subtle" size="sm" className="font-mono text-[10px]">
          {t.tier}
        </Badge>
      </div>

      {/* Footer: entitlement guard */}
      <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
        <LockClosed className="h-2.5 w-2.5" aria-hidden="true" />
        <span className="truncate">{t.footer}</span>
      </div>
    </div>
  );
}
