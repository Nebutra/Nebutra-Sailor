"use client";

import { Check, ChevronDown, MagnifyingGlass } from "@nebutra/icons";
import { DEFAULT_THEME, listThemesAsLegacyEntries } from "@nebutra/theme/registry";
import { Input, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
// Route-split: pulls the theme token-sets, but only into the appearance page
// chunk (never the global bundle — AppearanceVarsProvider lazy-imports it).
import {
  getSwatchesFromTokenSet,
  getThemeSwatches,
  type ThemeTokenSet,
} from "@/components/theme-playground/theme-token-data";
import { useAppearance } from "./store";

const DEFAULT_ID = "default";

function MiniSwatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {colors.slice(0, 5).map((color, i) => (
        <span
          key={`${i}-${color}`}
          className="size-3 rounded-[var(--radius-sm)] ring-1 ring-border/60"
          style={{ background: color }}
        />
      ))}
    </span>
  );
}

/**
 * Compact theme selector — replaces the full-page preset gallery with a single
 * dropdown that opens a searchable list of every registry theme. Selecting a
 * theme clears any imported DESIGN.md (registry preset takes over).
 */
export function ThemePresetDropdown() {
  const t = useTranslations("settings.appearance.themePreset");
  const tEditor = useTranslations("settings.appearance.themeEditor");
  const [state, update] = useAppearance();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const hasImported = Boolean(state.importedTheme);
  const isDefault = !hasImported && (!state.theme || state.theme === DEFAULT_ID);
  const activeRegistry = listThemesAsLegacyEntries().find((theme) => theme.id === state.theme);

  const activeLabel = hasImported
    ? (state.importedTheme?.name ?? tEditor("custom"))
    : isDefault
      ? t("default")
      : (activeRegistry?.name ?? state.theme);

  const triggerSwatches = hasImported
    ? getSwatchesFromTokenSet(state.importedTheme?.tokenSet as unknown as ThemeTokenSet)
    : getThemeSwatches(isDefault ? DEFAULT_THEME : state.theme);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return listThemesAsLegacyEntries();
    return listThemesAsLegacyEntries().filter((theme) =>
      `${theme.name} ${theme.id} ${theme.category} ${theme.mood}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  function select(themeId: string) {
    update({ theme: themeId, importedTheme: null });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={tEditor("selectLabel")}
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-3 py-1.5",
          "text-sm text-foreground transition-colors hover:bg-muted",
        )}
      >
        <MiniSwatches colors={triggerSwatches} />
        <span className="max-w-[10rem] truncate font-medium">{activeLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="mb-2">
          <Input
            aria-label={t("searchLabel")}
            placeholder={t("search")}
            value={query}
            onValueChange={setQuery}
            prefix={<MagnifyingGlass className="size-4" />}
            size="sm"
          />
        </div>
        <div className="max-h-[18rem] space-y-0.5 overflow-y-auto pr-1">
          <ThemeOption
            active={isDefault}
            label={t("default")}
            mood={t("defaultMood")}
            swatches={getThemeSwatches(DEFAULT_THEME)}
            onSelect={() => select(DEFAULT_ID)}
          />
          {filtered.map((theme) => (
            <ThemeOption
              key={theme.id}
              active={!hasImported && state.theme === theme.id}
              label={theme.name}
              mood={theme.mood}
              swatches={getThemeSwatches(theme.id)}
              onSelect={() => select(theme.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-muted-foreground text-sm">{t("empty")}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ThemeOption({
  active,
  label,
  mood,
  swatches,
  onSelect,
}: {
  active: boolean;
  label: string;
  mood: string;
  swatches: string[];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <MiniSwatches colors={swatches} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground text-sm">{label}</span>
        <span className="block truncate text-muted-foreground text-xs">{mood}</span>
      </span>
      {active && <Check className="size-4 shrink-0 text-foreground" />}
    </button>
  );
}
