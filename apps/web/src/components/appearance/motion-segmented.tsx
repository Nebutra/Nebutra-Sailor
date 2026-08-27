"use client";

import { Switch } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { AppearanceMotion } from "./store";
import { useAppearance } from "./store";

const OPTIONS: ReadonlyArray<AppearanceMotion> = ["system", "on", "off"];

export function MotionSegmented() {
  const t = useTranslations("settings.appearance.motion");
  const [state, update] = useAppearance();

  return (
    <Switch
      size="small"
      value={state.motion}
      onValueChange={(value) => update({ motion: value as AppearanceMotion })}
      aria-label={t("label")}
    >
      {OPTIONS.map((value) => (
        <Switch.Control key={value} value={value} label={t(value)} />
      ))}
    </Switch>
  );
}
