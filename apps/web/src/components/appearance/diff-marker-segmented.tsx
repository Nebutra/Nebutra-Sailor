"use client";

import { Switch } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { AppearanceDiffMarkers } from "./store";
import { useAppearance } from "./store";

const OPTIONS: ReadonlyArray<AppearanceDiffMarkers> = ["color", "plusminus"];

export function DiffMarkerSegmented() {
  const t = useTranslations("settings.appearance.diffMarkers");
  const [state, update] = useAppearance();

  return (
    <Switch
      size="small"
      value={state.diffMarkers}
      onValueChange={(value) => update({ diffMarkers: value as AppearanceDiffMarkers })}
      aria-label={t("label")}
    >
      {OPTIONS.map((value) => (
        <Switch.Control key={value} value={value} label={t(value)} />
      ))}
    </Switch>
  );
}
