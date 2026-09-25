"use client";

import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import type { AppearanceAccent } from "./store";
import { ACCENT_SWATCHES, useAppearance } from "./store";

type Swatch = {
  value: AppearanceAccent;
  color: string;
  ring?: boolean;
};

const SWATCHES: ReadonlyArray<Swatch> = [
  { value: "default", color: "hsl(var(--foreground))", ring: true },
  ...Object.entries(ACCENT_SWATCHES).map(([value, color]) => ({
    value: value as AppearanceAccent,
    color,
  })),
];

export function AccentSwatchPicker() {
  const t = useTranslations("settings.appearance.accent");
  const [state, update] = useAppearance();

  return (
    <div className="flex flex-wrap items-center gap-3" role="toolbar" aria-label={t("label")}>
      {SWATCHES.map(({ value, color, ring }) => {
        const active = state.accent === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={t(`options.${value}`)}
            onClick={() => update({ accent: value })}
            className={cn(
              "size-6 rounded-full transition-shadow",
              "ring-offset-2 ring-offset-card",
              active && "ring-2 ring-foreground",
              !active && ring && "ring-1 ring-inset ring-border",
            )}
            style={{ background: color }}
          />
        );
      })}
    </div>
  );
}
