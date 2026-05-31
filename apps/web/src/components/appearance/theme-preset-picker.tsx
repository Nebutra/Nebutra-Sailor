"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { THEME_REGISTRY } from "@nebutra/theme/registry";
import { Badge, Input } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
// Route-split: pulls the theme token-sets, but only into the appearance page
// chunk (never the global bundle — AppearanceVarsProvider lazy-imports it).
import { getThemeSwatches } from "@/components/theme-playground/theme-token-data";
import { useAppearance } from "./store";

const DEFAULT_ID = "default";

function SwatchRow({ colors }: { colors: string[] }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {colors.map((color, i) => (
        <span
          key={`${i}-${color}`}
          className="size-5 rounded-[var(--radius-sm)] border border-white/10 shadow-sm"
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

function PresetCard({
  active,
  name,
  mood,
  swatches,
  tags,
  onSelect,
  activeLabel,
}: {
  active: boolean;
  name: string;
  mood: string;
  swatches: string[];
  tags: string[];
  onSelect: () => void;
  activeLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={name}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-lg)] border bg-card p-3 text-left transition",
        active
          ? "border-foreground ring-1 ring-foreground"
          : "border-border hover:border-foreground/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">{name}</p>
          <p className="truncate text-muted-foreground text-xs">{mood}</p>
        </div>
        {active && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {activeLabel}
          </Badge>
        )}
      </div>
      <SwatchRow colors={swatches} />
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
}

export function ThemePresetPicker() {
  const t = useTranslations("settings.appearance.themePreset");
  const [state, update] = useAppearance();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return THEME_REGISTRY.themes;
    return THEME_REGISTRY.themes.filter((theme) =>
      `${theme.name} ${theme.id} ${theme.category} ${theme.mood}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  // importedTheme takes precedence — no registry preset is "active" while one is loaded.
  const hasImported = Boolean(state.importedTheme);
  const defaultActive = !hasImported && (!state.theme || state.theme === DEFAULT_ID);

  return (
    <div className="space-y-3">
      <Input
        aria-label={t("searchLabel")}
        placeholder={t("search")}
        value={query}
        onValueChange={setQuery}
        prefix={<MagnifyingGlass className="size-4" />}
        size="sm"
      />

      <div className="grid max-h-[28rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        <PresetCard
          active={defaultActive}
          name={t("default")}
          mood={t("defaultMood")}
          swatches={getThemeSwatches(THEME_REGISTRY.defaultTheme)}
          tags={[]}
          onSelect={() => update({ theme: DEFAULT_ID, importedTheme: null })}
          activeLabel={t("active")}
        />

        {filtered.map((theme) => (
          <PresetCard
            key={theme.id}
            active={!hasImported && state.theme === theme.id}
            name={theme.name}
            mood={theme.mood}
            swatches={getThemeSwatches(theme.id)}
            tags={[theme.category, `WCAG ${theme.governance.wcag}`]}
            onSelect={() => update({ theme: theme.id, importedTheme: null })}
            activeLabel={t("active")}
          />
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-muted-foreground text-sm">
            {t("empty")}
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">{t("count", { count: filtered.length })}</p>
    </div>
  );
}
