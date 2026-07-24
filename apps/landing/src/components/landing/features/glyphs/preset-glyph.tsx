"use client";

import { Box, Check, SettingsGear, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";
import type { SubpackageGlyphProps } from "./types";

/**
 * PresetGlyph
 *
 * Feature-based SaaS starter preset chooser. A 2x2 grid of four preset
 * tiles (Indie, Pro [active], Enterprise, Custom) sits above a mono
 * footer showing the `nebutra preset:apply pro` CLI command.
 */

type PresetTone = "neutral" | "active";

type PresetCard = {
  id: "indie" | "pro" | "enterprise" | "custom";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: PresetTone;
};

const PRESETS: ReadonlyArray<PresetCard> = [
  { id: "indie", icon: Box, tone: "neutral" },
  { id: "pro", icon: Sparkles, tone: "active" },
  { id: "enterprise", icon: Check, tone: "neutral" },
  { id: "custom", icon: SettingsGear, tone: "neutral" },
];

const COPY = {
  en: {
    labels: {
      indie: "Indie",
      pro: "Pro",
      enterprise: "Enterprise",
      custom: "Custom",
    },
    meta: {
      indie: "4 features",
      pro: "12 features",
      enterprise: "12+ · SSO · audit",
      custom: "pick",
    },
    active: "active",
    footer: "$ nebutra preset:apply pro",
  },
  zh: {
    labels: {
      indie: "独立",
      pro: "Pro",
      enterprise: "企业",
      custom: "自定义",
    },
    meta: {
      indie: "4 项能力",
      pro: "12 项能力",
      enterprise: "12+ · SSO · 审计",
      custom: "选择",
    },
    active: "当前",
    footer: "$ nebutra preset:apply pro",
  },
} as const;

export function PresetGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-lg)] bg-muted px-3 py-2"
      style={{ height: 160 }}
    >
      {/* 2x2 preset grid */}
      <ul className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
        {PRESETS.map(({ id, icon: Icon, tone }) => {
          const active = tone === "active";
          return (
            <li
              key={id}
              className="flex flex-col justify-between rounded-[var(--radius-md)] bg-background px-2 py-1.5"
              style={active ? { boxShadow: "inset 0 0 0 1px hsl(var(--primary))" } : undefined}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 truncate font-mono text-[10px] text-foreground">
                  <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {t.labels[id]}
                </span>
                {active ? (
                  <Badge variant="blue" size="sm" className="h-4 px-1 font-mono text-[9px]">
                    {t.active}
                  </Badge>
                ) : null}
              </div>
              <Badge
                variant="gray-subtle"
                size="sm"
                className="h-4 w-fit px-1 font-mono text-[9px]"
              >
                {t.meta[id]}
              </Badge>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <p className="text-center font-mono text-[9px] text-muted-foreground">{t.footer}</p>
    </div>
  );
}
