"use client";

import { Check, Globe } from "@nebutra/icons";
import { useLocale } from "next-intl";
import { useCallback, useMemo, useTransition } from "react";
import { setLocaleCookie } from "./cookies";
import {
  compactLanguageTriggerLabel,
  PRODUCT_LANGUAGE_META,
  type ProductLanguage,
  productLanguageEndonymLabels,
} from "./languages";
import { LocalePanel } from "./locale-panel";
import { canonicalizeLocale, canonicalizeLocaleOrDefault, toMessageLocale } from "./locales";
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
  /** Optional group heading above non-active languages. */
  allLanguagesLabel?: string;
}

export interface LocaleSwitcherProps<TLocale extends string = string> {
  ariaLabel?: string;
  labels?: Partial<Record<TLocale, string>>;
  className?: string;
}

function useDefaultAriaLabel(): string {
  return "Change language";
}

function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
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
 *
 * Presentation: the shared LocalePanel — the same solid, header-anchored
 * surface the marketing market picker uses. Do not move this back onto the DS
 * Popover: that surface is translucent (`bg-popover/95 + backdrop-blur`) and
 * portals to <body>, which is what made the panel bleed the hero headline
 * through and let the wheel chain to the document.
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
    allLanguagesLabel = "All languages",
  } = config;

  function LocaleSwitcher({
    ariaLabel: ariaLabelProp,
    labels: labelsProp,
    className,
  }: LocaleSwitcherProps<TLocale> = {}) {
    const rawLocale = useLocale();
    // Normalize next-intl locale into the same ID space as `locales` (canonical
    // BCP-47 for cookie apps, message keys for path apps).
    const locale = useMemo(() => {
      const exact = locales.find((l) => l === rawLocale);
      if (exact) return exact;
      const canon = canonicalizeLocale(rawLocale);
      if (canon) {
        const byCanon = locales.find(
          (l) =>
            l === canon ||
            canonicalizeLocale(l) === canon ||
            toMessageLocale(l) === toMessageLocale(canon),
        );
        if (byCanon) return byCanon;
      }
      const msg = toMessageLocale(rawLocale);
      const byMsg = locales.find((l) => l === msg || toMessageLocale(l) === msg);
      if (byMsg) return byMsg;
      return (rawLocale as TLocale) || (locales[0] as TLocale);
    }, [rawLocale, locales]);

    const configLabels = typeof labelsOrHook === "function" ? labelsOrHook() : labelsOrHook;
    const labels: Record<TLocale, string> = labelsProp
      ? ({ ...configLabels, ...labelsProp } as Record<TLocale, string>)
      : configLabels;
    const defaultAriaLabel = useAriaLabel();
    const ariaLabel = ariaLabelProp ?? defaultAriaLabel;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const showSearch = searchThreshold === 0 || locales.length > searchThreshold;

    const { activeLocale, otherLocales } = useMemo(() => {
      const active = locale && locales.includes(locale) ? locale : undefined;
      const others = locales.filter((l) => l !== active);
      return { activeLocale: active, otherLocales: others };
    }, [locale, locales]);

    const prefetchOthers = useCallback(() => {
      if (mode !== "path" || typeof router.prefetch !== "function") return;
      for (const l of locales) {
        if (l === locale) continue;
        try {
          router.prefetch(pathname, { locale: l });
        } catch {
          // older adapters may reject options
        }
      }
    }, [locale, locales, mode, pathname, router]);

    const handleSelect = useCallback(
      (next: TLocale) => {
        if (next === locale) return;
        // Cookie mode: always persist canonical BCP-47 so request.ts matches.
        const cookieValue = mode === "cookie" ? canonicalizeLocaleOrDefault(next) : next;
        setLocaleCookie(cookieValue);
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

    const matches = (l: TLocale, query: string) =>
      !query || `${labels[l] ?? ""} ${toMessageLocale(l)} ${l}`.toLowerCase().includes(query);

    const renderItem = (l: TLocale, close: () => void) => {
      const isActive = l === locale;
      const label = labels[l] ?? String(l);
      // Compact message key (de, zh-Hans) — not full BCP-47 — for scannable rails
      const code = toMessageLocale(l);
      return (
        <button
          key={l}
          type="button"
          aria-current={isActive ? "true" : undefined}
          onClick={() => {
            close();
            handleSelect(l);
          }}
          className={cn(
            // min-h-11: same 44px tap target the market picker rows use.
            "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-colors",
            isActive
              ? "bg-neutral-3 font-medium text-neutral-12"
              : "text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-start">{label}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-neutral-9">{code}</span>
          <Check
            className={cn("h-3.5 w-3.5 shrink-0", isActive ? "opacity-100" : "opacity-0")}
            aria-hidden
          />
        </button>
      );
    };

    return (
      <LocalePanel
        className={className}
        disabled={isPending}
        showSearch={showSearch}
        onOpen={prefetchOthers}
        copy={{
          triggerAria: ariaLabel,
          menuAria: menuAriaLabel,
          searchPlaceholder,
          noResults: noResultsLabel,
          closeAria: ariaLabel,
        }}
        trigger={
          <>
            <Globe className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate text-left normal-case tracking-normal text-neutral-12">
              {displayLocale(locale)}
            </span>
          </>
        }
      >
        {(query, close) => {
          const pinned = activeLocale && matches(activeLocale, query) ? activeLocale : undefined;
          const rest = otherLocales.filter((l) => matches(l, query));
          if (!pinned && rest.length === 0) {
            return (
              <p className="px-2 py-6 text-center text-sm text-neutral-11">{noResultsLabel}</p>
            );
          }
          return (
            <>
              {pinned ? renderItem(pinned, close) : null}
              {pinned && rest.length > 0 ? (
                <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-neutral-9">
                  {allLanguagesLabel}
                </p>
              ) : null}
              {rest.map((l) => renderItem(l, close))}
            </>
          );
        }}
      </LocalePanel>
    );
  }

  LocaleSwitcher.displayName = "LocaleSwitcher";
  return LocaleSwitcher;
}
