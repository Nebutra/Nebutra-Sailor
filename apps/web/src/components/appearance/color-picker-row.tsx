"use client";

import { Input, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AppearanceState } from "./store";
import { useAppearance } from "./store";

type ColorKey = Extract<keyof AppearanceState, "backgroundColor" | "foregroundColor">;

interface ColorPickerRowProps {
  label: string;
  description?: string;
  valueKey: ColorKey;
}

// Mirror accent-swatch-picker palette so users get a consistent preset set.
const PRESETS: ReadonlyArray<string> = [
  "#ffffff",
  "#0a0a0a",
  "#3b82f6",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ColorPickerRow({ label, description, valueKey }: ColorPickerRowProps) {
  const t = useTranslations("settings.appearance.colors");
  const [state, update] = useAppearance();
  const value = state[valueKey] as string | null | undefined;
  const display = value ?? "";
  const [draft, setDraft] = useState<string>(display);

  function commit(next: string | null) {
    update({ [valueKey]: next } as Partial<AppearanceState>);
    setDraft(next ?? "");
  }

  function handleHexInput(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;
    setDraft(next);
    if (HEX_RE.test(next)) commit(next);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <Popover>
        <PopoverTrigger
          aria-label={label}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5",
            "text-xs font-mono tabular-nums text-foreground transition-colors hover:bg-muted",
          )}
        >
          <span
            aria-hidden="true"
            className="size-4 rounded-full ring-1 ring-border"
            style={{ background: value ?? "transparent" }}
          />
          <span>{value ?? "—"}</span>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label={label}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={preset}
                  aria-pressed={value === preset}
                  onClick={() => commit(preset)}
                  className={cn(
                    "size-6 rounded-full ring-1 ring-inset ring-border transition-shadow",
                    value === preset && "ring-2 ring-foreground",
                  )}
                  style={{ background: preset }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                data-allow-native
                type="color"
                aria-label={label}
                value={HEX_RE.test(display) ? display : "#000000"}
                onChange={(e) => commit(e.currentTarget.value)}
                className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
              <Input
                value={draft}
                onChange={handleHexInput}
                placeholder="#000000"
                maxLength={7}
                className="h-8 flex-1 font-mono text-xs"
                aria-label={label}
              />
            </div>
            <button
              type="button"
              onClick={() => commit(null)}
              className="text-left text-xs text-muted-foreground hover:text-foreground"
            >
              {t("resetToDefault")}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
