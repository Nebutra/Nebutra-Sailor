"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { AppearanceState } from "./store";
import { useAppearance } from "./store";

type FontSizeKey = Extract<keyof AppearanceState, "uiFontSize" | "codeFontSize">;

interface FontSizeStepperProps {
  label: string;
  description?: string;
  min: number;
  max: number;
  valueKey: FontSizeKey;
  /** px value used when switching from "follow theme" to an explicit size. */
  defaultPx: number;
}

export function FontSizeStepper({
  label,
  description,
  min,
  max,
  valueKey,
  defaultPx,
}: FontSizeStepperProps) {
  const t = useTranslations("settings.appearance.fontSize");
  const [state, update] = useAppearance();
  const value = state[valueKey];
  const isTheme = value === "theme";

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(event.currentTarget.value);
    if (!Number.isFinite(next)) return;
    const clamped = Math.min(max, Math.max(min, Math.round(next)));
    update({ [valueKey]: clamped } as Partial<AppearanceState>);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <div className="flex items-center gap-2">
        {isTheme ? (
          <>
            <span className="text-xs text-muted-foreground">{t("followTheme")}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                update({
                  [valueKey]: Math.min(max, Math.max(min, defaultPx)),
                } as Partial<AppearanceState>)
              }
            >
              {t("customize")}
            </Button>
          </>
        ) : (
          <>
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              value={value}
              onChange={handleChange}
              className="h-8 w-20 text-right tabular-nums"
              aria-label={label}
            />
            <span className="text-xs text-muted-foreground">px</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => update({ [valueKey]: "theme" } as Partial<AppearanceState>)}
            >
              {t("followTheme")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
