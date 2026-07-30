"use client";

import { Check, Globe } from "@nebutra/icons";
import { useLocale } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { readMarketCookie, setLocaleCookie, setMarketCookie } from "./cookies";
import { getLanguageEndonym, getRegionDisplayName } from "./display-names";
import type { ProductLanguage } from "./languages";
import { LocalePanel } from "./locale-panel";
import {
  buildLanguagePickerEntries,
  buildMarketPickerEntries,
  createMarketLocale,
  getMarketLocaleLabels,
  type LanguagePickerEntry,
  type MarketLocale,
  type MarketPickerEntry,
  marketLocaleForLanguage,
} from "./market-locale";
import { pinScrollPosition } from "./scroll-pin";

export interface MarketLocalePickerHooks {
  // biome-ignore lint/suspicious/noExplicitAny: multi-app router adapters
  useRouter: () => any;
  usePathname: () => string;
}

export interface MarketLocalePickerCopy {
  title: string;
  description: string;
  triggerAria: string;
  searchPlaceholder: string;
  plannedHint: string;
  noResults: string;
  menuAria: string;
}

export interface MarketLocalePickerConfig {
  copy: MarketLocalePickerCopy | (() => MarketLocalePickerCopy);
  displayLocale?: string | (() => string);
  className?: string;
}

export interface MarketLocalePickerProps {
  className?: string;
  initialMarket?: string;
  copy?: Partial<MarketLocalePickerCopy>;
}

const DEFAULT_COPY: MarketLocalePickerCopy = {
  title: "Language",
  description: "Choose the language for the marketing site.",
  triggerAria: "Select language",
  searchPlaceholder: "Search languages…",
  plannedHint: "Interface falls back to English until this language ships",
  noResults: "No languages match",
  menuAria: "Languages",
};

function languageMatches(entry: LanguagePickerEntry, q: string): boolean {
  if (!q) return true;
  return `${entry.endonym} ${entry.language}`.toLowerCase().includes(q);
}

export function createMarketLocalePicker(
  hooks: MarketLocalePickerHooks,
  config: MarketLocalePickerConfig,
) {
  const { useRouter, usePathname } = hooks;

  function MarketLocalePicker({
    className,
    initialMarket,
    copy: copyProp,
  }: MarketLocalePickerProps = {}) {
    const routeLocale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [marketCountry, setMarketCountry] = useState(() =>
      (initialMarket ?? readMarketCookie() ?? "US").toUpperCase(),
    );

    const baseCopy = typeof config.copy === "function" ? config.copy() : config.copy;
    const copy: MarketLocalePickerCopy = { ...DEFAULT_COPY, ...baseCopy, ...copyProp };
    const displayLocale =
      typeof config.displayLocale === "function"
        ? config.displayLocale()
        : (config.displayLocale ?? routeLocale);

    const entries = useMemo(() => buildMarketPickerEntries(displayLocale), [displayLocale]);
    // Language list is display-locale independent: endonyms are the language's
    // own name, which is the point — a reader finds their language without
    // already reading the current one.
    const languageEntries = useMemo(() => buildLanguagePickerEntries(), []);

    const activeLocale: MarketLocale = useMemo(() => {
      const pair = createMarketLocale(marketCountry, routeLocale as ProductLanguage);
      if (pair) return pair;
      const def =
        entries.find((e) => e.market.country === marketCountry)?.market.defaultLanguage ?? "en";
      return createMarketLocale(marketCountry, def) ?? createMarketLocale("US", "en")!;
    }, [marketCountry, routeLocale, entries]);

    const labels = useMemo(
      () => getMarketLocaleLabels(activeLocale, displayLocale),
      [activeLocale, displayLocale],
    );

    const handleSelect = useCallback(
      (next: MarketLocale) => {
        const sameLanguage = next.messageKey === routeLocale;
        const sameMarket = next.country === marketCountry;
        if (sameLanguage && sameMarket) return;
        setMarketCookie(next.country);
        setLocaleCookie(next.messageKey);
        setMarketCountry(next.country);
        pinScrollPosition();
        if (sameLanguage) {
          startTransition(() => router.refresh());
          return;
        }
        startTransition(() => {
          try {
            router.prefetch?.(pathname, { locale: next.messageKey });
          } catch {
            /* ignore */
          }
          router.replace(pathname, { locale: next.messageKey, scroll: false });
        });
      },
      [marketCountry, pathname, routeLocale, router],
    );

    return (
      <LocalePanel
        className={className ?? config.className}
        disabled={isPending}
        // 720px gave each of two columns 360px to hold a word like "Dansk",
        // so the panel was mostly empty and the rows drifted apart. 560px sizes
        // the columns to their content.
        width="min(560px, calc(100vw - 1.5rem))"
        copy={{
          triggerAria: copy.triggerAria,
          menuAria: copy.menuAria,
          searchPlaceholder: copy.searchPlaceholder,
          noResults: copy.noResults,
          closeAria: "Close",
          title: copy.title,
          description: copy.description,
        }}
        trigger={
          <>
            <Globe className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate text-left normal-case tracking-normal">
              <span className="text-foreground">{activeLocale.pathTag}</span>
              <span className="text-muted-foreground/70"> · </span>
              <span>{labels.languageEndonym}</span>
            </span>
          </>
        }
      >
        {(query, close) => {
          const filtered = languageEntries.filter((e) => languageMatches(e, query));
          if (filtered.length === 0) {
            return (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {copy.noResults}
              </p>
            );
          }
          return (
            <div className="grid grid-cols-1 gap-0.5 p-1 sm:grid-cols-2">
              {filtered.map((entry) => {
                const isActive = activeLocale.language === entry.language;
                return (
                  <button
                    key={entry.language}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    title={entry.planned ? copy.plannedHint : undefined}
                    onClick={() => {
                      close();
                      // Keep the resolved market so switching language never
                      // silently changes the visitor's currency.
                      handleSelect(marketLocaleForLanguage(entry.language, activeLocale.country));
                    }}
                    className={[
                      // min-h-11: the row is the tap target, and a language list is the one
                      // control a phone user reaches for first.
                      "flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      entry.planned && !isActive ? "opacity-80" : "",
                    ].join(" ")}
                  >
                    <span className="min-w-0 flex-1 truncate">{entry.endonym}</span>
                    {/* The tag earns the row its second column of information.
                        Without it every row was one short word against a wide
                        empty gutter, which is what made the list read as
                        unfinished rather than sparse. */}
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
                      {entry.language}
                    </span>
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "opacity-100" : "opacity-0"}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          );
        }}
      </LocalePanel>
    );
  }

  MarketLocalePicker.displayName = "MarketLocalePicker";
  return MarketLocalePicker;
}

export function formatMarketTriggerLabel(ml: MarketLocale, displayLocale = "en"): string {
  return getMarketLocaleLabels(ml, displayLocale).trigger;
}

export function getRegionName(country: string, displayLocale = "en"): string {
  return getRegionDisplayName(country, displayLocale);
}

export function getLangEndonym(language: ProductLanguage): string {
  return getLanguageEndonym(language);
}
