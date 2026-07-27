"use client";

import { Check, Cross, Globe, MagnifyingGlass } from "@nebutra/icons";
import { useLocale } from "next-intl";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { readMarketCookie, setLocaleCookie, setMarketCookie } from "./cookies";
import { getLanguageEndonym, getRegionDisplayName } from "./display-names";
import type { ProductLanguage } from "./languages";
import {
  buildMarketPickerEntries,
  createMarketLocale,
  getMarketLocaleLabels,
  type MarketLocale,
  type MarketPickerEntry,
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
  title: "Countries and languages",
  description: "Select a country and language for the marketing site.",
  triggerAria: "Select country and language",
  searchPlaceholder: "Search countries…",
  plannedHint: "Interface falls back to English until this language ships",
  noResults: "No countries match",
  menuAria: "Countries and languages",
};

function entryMatches(entry: MarketPickerEntry, q: string): boolean {
  if (!q) return true;
  const hay = [
    entry.countryName,
    entry.market.nameEn,
    entry.market.country,
    ...entry.options.map((o) => o.endonym),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
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
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [marketCountry, setMarketCountry] = useState(() =>
      (initialMarket ?? readMarketCookie() ?? "US").toUpperCase(),
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const baseCopy = typeof config.copy === "function" ? config.copy() : config.copy;
    const copy: MarketLocalePickerCopy = { ...DEFAULT_COPY, ...baseCopy, ...copyProp };
    const displayLocale =
      typeof config.displayLocale === "function"
        ? config.displayLocale()
        : (config.displayLocale ?? routeLocale);

    const entries = useMemo(() => buildMarketPickerEntries(displayLocale), [displayLocale]);
    const filtered = useMemo(
      () => entries.filter((e) => entryMatches(e, query.trim().toLowerCase())),
      [entries, query],
    );

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

    useEffect(() => {
      if (!open) return;
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }, [open]);

    const handleSelect = useCallback(
      (next: MarketLocale) => {
        const sameLanguage = next.messageKey === routeLocale;
        const sameMarket = next.country === marketCountry;
        if (sameLanguage && sameMarket) {
          setOpen(false);
          return;
        }
        setMarketCookie(next.country);
        setLocaleCookie(next.messageKey);
        setMarketCountry(next.country);
        setOpen(false);
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

    const panelStyle: CSSProperties = {
      position: "absolute",
      right: 0,
      top: "100%",
      marginTop: 8,
      zIndex: 60,
      width: "min(720px, calc(100vw - 1.5rem))",
      maxHeight: "min(70vh, 560px)",
      display: "flex",
      flexDirection: "column",
    };

    return (
      <div
        ref={containerRef}
        className={className ?? config.className}
        style={{ position: "relative", display: "inline-block" }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <button
          type="button"
          aria-label={copy.triggerAria}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={isPending}
          onClick={() => {
            setOpen((v) => !v);
            setQuery("");
          }}
          className="inline-flex min-h-11 max-w-[min(280px,70vw)] items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:opacity-50"
        >
          <Globe className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate text-left normal-case tracking-normal">
            <span className="text-neutral-12">{activeLocale.pathTag}</span>
            <span className="text-neutral-9"> · </span>
            <span>{labels.languageEndonym}</span>
            <span className="hidden sm:inline text-neutral-9"> · {labels.countryName}</span>
          </span>
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label={copy.menuAria}
            aria-modal="false"
            style={panelStyle}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-1 shadow-xl"
          >
            <div className="border-b border-neutral-6 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-12">{copy.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-11">{copy.description}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-sm)] p-1 text-neutral-11 hover:bg-neutral-3"
                >
                  <Cross className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-2 px-2.5 py-1.5">
                <MagnifyingGlass className="h-4 w-4 shrink-0 text-neutral-10" aria-hidden />
                <input
                  ref={searchRef}
                  data-allow-native
                  type="text"
                  inputMode="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-neutral-12 outline-none placeholder:text-neutral-9"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-3">
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-neutral-11">{copy.noResults}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filtered.map((entry) => (
                    <div key={entry.market.country} className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-12">{entry.countryName}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {entry.options.map((opt) => {
                          const isActive =
                            activeLocale.country === entry.market.country &&
                            activeLocale.language === opt.language;
                          return (
                            <button
                              key={`${entry.market.country}-${opt.language}`}
                              type="button"
                              aria-current={isActive ? "true" : undefined}
                              title={opt.planned ? copy.plannedHint : undefined}
                              onClick={() => handleSelect(opt.marketLocale)}
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                                isActive
                                  ? "bg-neutral-12 text-neutral-1"
                                  : "bg-neutral-3 text-neutral-12 hover:bg-neutral-4",
                                opt.planned && !isActive ? "opacity-80" : "",
                              ].join(" ")}
                            >
                              {isActive ? <Check className="h-3 w-3" aria-hidden /> : null}
                              <span>{opt.endonym}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
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
