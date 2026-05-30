"use client";

import { Toggle } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useAppearance } from "./store";

export function FontSmoothingToggle() {
  const t = useTranslations("settings.appearance.fontSmoothing");
  const [state, update] = useAppearance();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{t("label")}</span>
        <span className="text-xs text-muted-foreground">{t("description")}</span>
      </div>
      <Toggle
        checked={state.fontSmoothing}
        onCheckedChange={(checked) => update({ fontSmoothing: checked })}
        aria-label={t("label")}
      />
    </div>
  );
}
