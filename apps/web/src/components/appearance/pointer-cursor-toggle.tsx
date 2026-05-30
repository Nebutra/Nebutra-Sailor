"use client";

import { Toggle } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useAppearance } from "./store";

export function PointerCursorToggle() {
  const t = useTranslations("settings.appearance.pointerCursor");
  const [state, update] = useAppearance();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{t("label")}</span>
        <span className="text-xs text-muted-foreground">{t("description")}</span>
      </div>
      <Toggle
        checked={state.pointerCursor}
        onCheckedChange={(checked) => update({ pointerCursor: checked })}
        aria-label={t("label")}
      />
    </div>
  );
}
