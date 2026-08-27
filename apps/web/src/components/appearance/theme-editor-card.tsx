"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AccentSwatchPicker } from "./accent-swatch-picker";
import { ColorPickerRow } from "./color-picker-row";
import { ContrastSlider } from "./contrast-slider";
import { CopyThemeButton } from "./copy-theme-button";
import { FontFamilyPicker } from "./font-family-picker";
import { ThemeImportButton } from "./theme-import-button";
import { ThemePresetDropdown } from "./theme-preset-dropdown";
import { TransparencyToggle } from "./transparency-toggle";

/** A labeled row for a control that doesn't render its own label (e.g. accent). */
function EditorRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="grid gap-1">
        <span className="font-medium text-foreground text-sm">{label}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Consolidated theme editor — the single card that replaces the former
 * standalone preset gallery, colors, font-family, contrast and surface
 * sections. Header carries the preset selector plus import/copy actions; the
 * body stacks the per-token fine-tuning rows.
 */
export function ThemeEditorCard() {
  const t = useTranslations("settings.appearance");

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{t("themeEditor.title")}</h3>
          <p className="mt-0.5 text-muted-foreground text-xs">{t("themeEditor.description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeImportButton />
          <CopyThemeButton />
          <ThemePresetDropdown />
        </div>
      </header>

      <div className="divide-y divide-border border-border border-t">
        <EditorRow label={t("accent.title")} description={t("accent.description")}>
          <AccentSwatchPicker />
        </EditorRow>
        <div className="px-4 py-3">
          <ColorPickerRow
            valueKey="backgroundColor"
            label={t("colors.background.label")}
            description={t("colors.background.description")}
          />
        </div>
        <div className="px-4 py-3">
          <ColorPickerRow
            valueKey="foregroundColor"
            label={t("colors.foreground.label")}
            description={t("colors.foreground.description")}
          />
        </div>
        <div className="px-4 py-3">
          <FontFamilyPicker
            valueKey="uiFontFamily"
            label={t("fontFamily.uiLabel")}
            description={t("fontFamily.uiDescription")}
          />
        </div>
        <div className="px-4 py-3">
          <FontFamilyPicker
            valueKey="codeFontFamily"
            label={t("fontFamily.codeLabel")}
            description={t("fontFamily.codeDescription")}
          />
        </div>
        <div className="px-4 py-3">
          <TransparencyToggle />
        </div>
        <div className="px-4 py-3">
          <ContrastSlider />
        </div>
      </div>
    </section>
  );
}
