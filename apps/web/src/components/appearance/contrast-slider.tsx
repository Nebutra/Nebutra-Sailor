"use client";

import { Slider } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useAppearance } from "./store";

export function ContrastSlider() {
  const t = useTranslations("settings.appearance.contrast");
  const [state, update] = useAppearance();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{t("label")}</span>
        <span className="text-xs text-muted-foreground">{t("description")}</span>
      </div>
      <div className="flex w-56 items-center gap-3">
        <Slider
          min={0}
          max={100}
          step={1}
          value={state.contrast}
          onValueChange={(next: number) => update({ contrast: next })}
          showValue={false}
          aria-label={t("label")}
        />
        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
          {state.contrast}
        </span>
      </div>
    </div>
  );
}
