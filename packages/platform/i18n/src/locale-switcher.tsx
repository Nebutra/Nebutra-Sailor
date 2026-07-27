"use client";

import { Check, Globe, MagnifyingGlass } from "@nebutra/icons";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { setLocaleCookie } from "./cookies";
import {
  compactLanguageTriggerLabel,
  PRODUCT_LANGUAGE_META,
  type ProductLanguage,
  productLanguageEndonymLabels,
} from "./languages";
import { toMessageLocale } from "./locales";
import { pinScrollPosition } from "./scroll-pin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocaleSwitcherHooks {
  // biome-ignore lint/suspicious/noExplicitAny: loose adapter for multi-locale routers
  useRouter: () => any;
  usePathname: () => string;
}

export interface LocaleSwitcherConfig<TLocale extends string> {
  locales: readonly TLocale[];
  /**
   * Static label map OR a hook that returns labels at render time.
   * Prefer endonyms (日本語, Deutsch) — never leave blanks for the full wheel.
   */
  labels: Record<TLocale, string> | (() => Record<TLocale, string>);
  useAriaLabel?: () => string;
  /**
   * - `"path"` — router.replace(pathname, {locale}) + prefetch (landing URL locales)
   * - `"cookie"` — NEXT_LOCALE cookie + router.refresh() (web/forge/router/auth)
   */
  mode?: "path" | "cookie";
  /** Compact code in the trigger (defaults to compactLanguageTriggerLabel). */
  displayLocale?: (locale: TLocale) => string;
  /** Show search when locale count exceeds this (default 12). Set 0 to always show. */
  searchThreshold?: number;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  menuAriaLabel?: string;
}

export interface LocaleSwitcherProps<TLocale extends string = string> {
  ariaLabel?: string;
  labels?: Partial<Record<TLocale, string>>;
  className?: string;
}

function useDefaultAriaLabel(): string {
  return "Change language";
}

// ---------------------------------------------------------------------------
// Public label helpers (apps import these instead of hand-rolling 7-locale maps)
// ---------------------------------------------------------------------------

/** Endonym map for product message keys (en, zh-Hans, …). */
export function buildMessageKeyLocaleLabels(): Record<ProductLanguage, string> {
  return productLanguageEndonymLabels();
}

/**
 * Endonym map for canonical BCP-47 tags (en-US, zh-Hans-CN, …)
 * used by apps/web cookie request config.
 */
export function buildCanonicalLocaleLabels(
  canonicalLocales: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of canonicalLocales) {
    const key = toMessageLocale(c);
    out[c] = PRODUCT_LANGUAGE_META[key]?.endonym ?? c;
  }
  return out;
}

export function defaultCompactTrigger(locale: string): string {
  return compactLanguageTriggerLabel(toMessageLocale(locale));
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Unified language switcher for all product apps.
 * Scroll-preserving, cookie or path mode, searchable full wheel.
 */
export function createLocaleSwitcher<TLocale extends string>(
  hooks: LocaleSwitcherHooks,
  config: LocaleSwitcherConfig<TLocale>,
) {
  const { useRouter, usePathname } = hooks;
  const {
    locales,
    labels: labelsOrHook,
    useAriaLabel = useDefaultAriaLabel,
    displayLocale = (locale: TLocale) => defaultCompactTrigger(locale),
    mode = "path",
    searchThreshold = 12,
    searchPlaceholder = "Search languages…",
    noResultsLabel = "No languages match",
    menuAriaLabel = "Select language",
  } = config;

  function LocaleSwitcher({
    ariaLabel: ariaLabelProp,
    labels: labelsProp,
    className,
  }: LocaleSwitcherProps<TLocale> = {}) {
    const locale = useLocale() as TLocale;
    const configLabels = typeof labelsOrHook === "function" ? labelsOrHook() : labelsOrHook;
    const labels: Record<TLocale, string> = labelsProp
      ? ({ ...configLabels, ...labelsProp } as Record<TLocale, string>)
      : configLabels;
    const defaultAriaLabel = useAriaLabel();
    const ariaLabel = ariaLabelProp ?? defaultAriaLabel;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const menuId = useId();
    const searchId = useId();

    const showSearch = searchThreshold === 0 || locales.length > searchThreshold;

    const ordered = useMemo(() => {
      // Active locale first for scannability
      const rest = locales.filter((l) => l !== locale);
      return locale && locales.includes(locale) ? [locale, ...rest] : [...locales];
    }, [locale, locales]);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return ordered;
      return ordered.filter((l) => {
        const label = (labels[l] ?? l).toLowerCase();
        return label.includes(q) || String(l).toLowerCase().includes(q);
      });
    }, [ordered, query, labels]);

    useEffect(() => {
      if (!open) {
        setQuery("");
        return;
      }
      if (showSearch) {
        // Focus search for keyboard users after open paint
        const t = window.setTimeout(() => searchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
      }
    }, [open, showSearch]);

    const handleOpen = useCallback(() => {
      setOpen((prev) => {
        if (!prev && mode === "path" && typeof router.prefetch === "function") {
          for (const l of locales) {
            if (l !== locale) {
              try {
                router.prefetch(pathname, { locale: l });
              } catch {
                // older adapters may reject options
              }
            }
          }
        }
        return !prev;
      });
    }, [locale, pathname, router, locales, mode]);

    const handleSelect = useCallback(
      (next: TLocale) => {
        if (next === locale) {
          setOpen(false);
          return;
        }
        setLocaleCookie(next);
        setOpen(false);
        pinScrollPosition();
        if (mode === "cookie") {
          startTransition(() => {
            router.refresh();
          });
        } else {
          startTransition(() => {
            router.replace(pathname, { locale: next, scroll: false });
          });
        }
      },
      [locale, pathname, router, mode],
    );

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    }, []);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
      if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
        setOpen(false);
      }
    }, []);

    // Outside click (pointer) — complements blur for mouse users
    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", display: "inline-block" }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          disabled={isPending}
          onClick={handleOpen}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:opacity-50"
        >
          <Globe className="h-4 w-4 shrink-0" aria-hidden />
          <span className="max-w-[7rem] truncate">{displayLocale(locale)}</span>
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            aria-label={menuAriaLabel}
            className="absolute end-0 top-full z-50 mt-1 flex w-[min(100vw-2rem,16rem)] flex-col overflow-hidden rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-1 shadow-lg"
          >
            {showSearch ? (
              <div className="shrink-0 border-b border-neutral-6 p-1.5">
                {/*
                  Flex row (icon sibling + text input) — not absolute-icon + type=search.
                  Absolute icon + WebKit search cancel (×) + placeholder stacked in h-8
                  and looked like icon/text overlap on product shells (forge/router).
                */}
                <label
                  htmlFor={searchId}
                  className="flex h-8 w-full items-center gap-2 rounded-[var(--radius-sm)] border border-neutral-6 bg-neutral-1 px-2.5 focus-within:border-neutral-8"
                >
                  <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-neutral-10" aria-hidden />
                  <span className="sr-only">{searchPlaceholder}</span>
                  <input
                    ref={searchRef}
                    id={searchId}
                    data-allow-native
                    type="text"
                    inputMode="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-neutral-12 outline-none placeholder:text-neutral-9"
                    onKeyDown={(e) => {
                      // Prevent menu from stealing first character focus quirks
                      e.stopPropagation();
                    }}
                  />
                </label>
              </div>
            ) : null}

            <div className="max-h-72 min-h-0 overflow-y-auto overscroll-contain p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-neutral-10">{noResultsLabel}</p>
              ) : (
                filtered.map((l) => {
                  const isActive = l === locale;
                  const label = labels[l] ?? String(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      role="menuitem"
                      aria-current={isActive ? ("true" as const) : undefined}
                      onClick={() => handleSelect(l)}
                      className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-start text-sm text-neutral-12 transition-colors hover:bg-neutral-2"
                    >
                      <span className="min-w-0 truncate">{label}</span>
                      {isActive ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  LocaleSwitcher.displayName = "LocaleSwitcher";
  return LocaleSwitcher;
}
