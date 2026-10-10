"use client";

import { Button, NumberField } from "@nebutra/ui/primitives";
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

  function handleChange(next: number | null) {
    if (next == null || !Number.isFinite(next)) return;
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
            <NumberField
              size="sm"
              min={min}
              max={max}
              step={1}
              value={value}
              onValueChange={handleChange}
              suffix="px"
              className="w-32"
              inputClassName="text-right"
              aria-label={label}
            />
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
