"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { AppearanceState } from "./store";
import { CODE_FONT_STACKS, UI_FONT_STACKS, useAppearance } from "./store";

type FontKey = Extract<keyof AppearanceState, "uiFontFamily" | "codeFontFamily">;

interface FontFamilyPickerProps {
  label: string;
  description?: string;
  valueKey: FontKey;
}

export function FontFamilyPicker({ label, description, valueKey }: FontFamilyPickerProps) {
  const t = useTranslations("settings.appearance.fontFamily.options");
  const [state, update] = useAppearance();
  const isUi = valueKey === "uiFontFamily";
  const stacks = isUi ? UI_FONT_STACKS : CODE_FONT_STACKS;
  const tNs = isUi ? "ui" : "code";
  const options = Object.keys(stacks);
  const value = state[valueKey] as string;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <Select
        value={value}
        onValueChange={(next) => update({ [valueKey]: next } as Partial<AppearanceState>)}
      >
        <SelectTrigger className="h-8 w-44" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {t(`${tNs}.${opt}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
