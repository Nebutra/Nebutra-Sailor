"use client";

import { Input } from "@nebutra/ui/primitives";
import type { AppearanceState } from "./store";
import { useAppearance } from "./store";

type FontSizeKey = Extract<keyof AppearanceState, "uiFontSize" | "codeFontSize">;

interface FontSizeStepperProps {
  label: string;
  description?: string;
  min: number;
  max: number;
  valueKey: FontSizeKey;
}

export function FontSizeStepper({ label, description, min, max, valueKey }: FontSizeStepperProps) {
  const [state, update] = useAppearance();
  const value = state[valueKey];

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
      </div>
    </div>
  );
}
