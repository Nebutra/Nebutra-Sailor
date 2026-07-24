"use client";

import { Check, ChevronDown, MagnifyingGlass } from "@nebutra/icons";
import {
  DEFAULT_LANGUAGE,
  type DesignLanguageEntry,
  LANGUAGE_REGISTRY,
} from "@nebutra/theme/languages";
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
import { APPEARANCE_FACTORY_LANGUAGE, isFactoryLanguageId, useAppearance } from "./store";

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
 * Compact theme selector — searchable design-language list (LANGUAGE_REGISTRY).
 * Selecting a language clears any imported DESIGN.md.
 */
export function ThemePresetDropdown() {
  const t = useTranslations("settings.appearance.themePreset");
  const tEditor = useTranslations("settings.appearance.themeEditor");
  const [state, update] = useAppearance();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const languages = LANGUAGE_REGISTRY.languages;

  const hasImported = Boolean(state.importedTheme);
  const isFactory = !hasImported && isFactoryLanguageId(state.theme);
  const activeLanguage = languages.find((lang) => lang.id === state.theme);

  const activeLabel = hasImported
    ? (state.importedTheme?.name ?? tEditor("custom"))
    : isFactory
      ? t("default")
      : (activeLanguage?.name ?? state.theme);

  const triggerSwatches = hasImported
    ? getSwatchesFromTokenSet(state.importedTheme?.tokenSet as unknown as ThemeTokenSet)
    : getThemeSwatches(isFactory ? DEFAULT_LANGUAGE : state.theme);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return languages;
    return languages.filter((lang) => languageSearchBlob(lang).includes(normalized));
  }, [languages, query]);

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
            active={isFactory}
            label={t("default")}
            description={t("defaultMood")}
            swatches={getThemeSwatches(DEFAULT_LANGUAGE)}
            onSelect={() => select(APPEARANCE_FACTORY_LANGUAGE)}
          />
          {filtered
            .filter((lang) => lang.id !== APPEARANCE_FACTORY_LANGUAGE)
            .map((lang) => (
              <ThemeOption
                key={lang.id}
                active={!hasImported && state.theme === lang.id}
                label={lang.name}
                description={lang.description}
                swatches={getThemeSwatches(lang.id)}
                onSelect={() => select(lang.id)}
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

function languageSearchBlob(lang: DesignLanguageEntry): string {
  return `${lang.name} ${lang.id} ${lang.description} ${lang.proves.join(" ")}`.toLowerCase();
}

function ThemeOption({
  active,
  label,
  description,
  swatches,
  onSelect,
}: {
  active: boolean;
  label: string;
  description: string;
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
        <span className="block truncate text-muted-foreground text-xs">{description}</span>
      </span>
      {active && <Check className="size-4 shrink-0 text-foreground" />}
    </button>
  );
}
