"use client";

import { BlendMode, Check, Droplet } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * ThemeGlyph — CSS-only multi-theme switcher preview.
 *
 * Six theme preview cards in a row, each showing a primary swatch and
 * a name pill. The active theme is marked with a primary ring border
 * and a Check overlay. Footer cites the data-theme attribute contract
 * powering the oklch theme engine.
 */

const COPY = {
  en: {
    heading: "Theme",
    footer: 'data-theme="nebutra" · oklch',
  },
  zh: {
    heading: "主题",
    footer: 'data-theme="nebutra" · oklch',
  },
} as const;

type ThemeCard = {
  id: "nebutra" | "dark-dense" | "minimal" | "vibrant" | "ocean";
  label: string;
  swatch: string;
  pillFg: string;
};

const THEMES: readonly ThemeCard[] = [
  {
    id: "nebutra",
    label: "nebutra",
    swatch: "linear-gradient(135deg, oklch(0.45 0.22 255), oklch(0.70 0.18 185))",
    pillFg: "oklch(0.45 0.22 255)",
  },
  {
    id: "dark-dense",
    label: "dark",
    swatch: "linear-gradient(135deg, oklch(0.18 0.01 270), oklch(0.10 0.01 270))",
    pillFg: "oklch(0.30 0.02 270)",
  },
  {
    id: "minimal",
    label: "minimal",
    swatch: "linear-gradient(135deg, oklch(0.96 0.02 80), oklch(0.92 0.03 75))",
    pillFg: "oklch(0.45 0.04 75)",
  },
  {
    id: "vibrant",
    label: "vibrant",
    swatch: "linear-gradient(135deg, oklch(0.70 0.22 25), oklch(0.62 0.24 15))",
    pillFg: "oklch(0.55 0.22 20)",
  },
  {
    id: "ocean",
    label: "ocean",
    swatch: "linear-gradient(135deg, oklch(0.68 0.15 220), oklch(0.55 0.18 240))",
    pillFg: "oklch(0.50 0.18 230)",
  },
] as const;

const ACTIVE_ID = "nebutra";

export function ThemeGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-3 shadow-sm ring-1 ring-[var(--neutral-6)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--neutral-12)]">
            <BlendMode className="h-3 w-3" aria-hidden="true" />
            <span>{t.heading}</span>
          </div>
          <Badge variant="outline" size="sm" className="h-4 gap-1 px-1.5 font-mono text-[9px]">
            <Droplet className="h-2 w-2" aria-hidden="true" />5
          </Badge>
        </div>

        {/* Theme cards row */}
        <div className="flex items-stretch gap-1">
          {THEMES.map((theme) => {
            const isActive = theme.id === ACTIVE_ID;
            return (
              <div
                key={theme.id}
                className="relative flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-md)] bg-[var(--neutral-2)] p-1"
                style={{
                  boxShadow: isActive
                    ? "0 0 0 1.5px var(--brand-primary)"
                    : "inset 0 0 0 1px var(--neutral-6)",
                }}
              >
                <div className="h-6 w-full rounded" style={{ background: theme.swatch }} />
                <span
                  className="w-full truncate text-center font-mono text-[8px] leading-tight"
                  style={{ color: theme.pillFg }}
                >
                  {theme.label}
                </span>
                {isActive ? (
                  <div
                    className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full text-white shadow-sm"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    <Check className="h-2 w-2" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="font-mono text-[9px] text-[var(--neutral-10)]">{t.footer}</div>
      </div>
    </div>
  );
}
