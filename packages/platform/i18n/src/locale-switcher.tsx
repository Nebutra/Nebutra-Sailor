"use client";

import { Check, ChevronDown, Globe } from "@nebutra/icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nebutra/ui/primitives";
import { useLocale } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { setLocaleCookie } from "./cookies";
import {
  compactLanguageTriggerLabel,
  PRODUCT_LANGUAGE_META,
  type ProductLanguage,
  productLanguageEndonymLabels,
} from "./languages";
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
 * Presentation: DS Popover + Command (portal, keyboard, search chrome).
 * Do not reintroduce hand-rolled absolute menus + native type=search.
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
    const [open, setOpen] = useState(false);

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

    const handleOpenChange = useCallback(
      (next: boolean) => {
        setOpen(next);
        if (next) prefetchOthers();
      },
      [prefetchOthers],
    );

    const handleSelect = useCallback(
      (next: TLocale) => {
        if (next === locale) {
          setOpen(false);
          return;
        }
        // Cookie mode: always persist canonical BCP-47 so request.ts matches.
        const cookieValue = mode === "cookie" ? canonicalizeLocaleOrDefault(next) : next;
        setLocaleCookie(cookieValue);
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

    const renderItem = (l: TLocale, opts?: { pinned?: boolean }) => {
      const isActive = l === locale;
      const label = labels[l] ?? String(l);
      // Compact message key (de, zh-Hans) — not full BCP-47 — for scannable rails
      const code = toMessageLocale(l);
      return (
        <CommandItem
          key={l}
          value={`${label} ${code} ${l}`}
          data-checked={isActive ? "true" : undefined}
          onSelect={() => handleSelect(l)}
          className={cn(
            "flex cursor-pointer items-center gap-2 px-2.5 py-2 text-sm",
            isActive && "bg-accent/60 font-medium text-accent-foreground",
            opts?.pinned && "aria-[selected=false]:bg-accent/40",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-start">{label}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{code}</span>
          <Check
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-primary",
              isActive ? "opacity-100" : "opacity-0",
            )}
            aria-hidden
          />
        </CommandItem>
      );
    };

    return (
      <div className={cn("inline-flex", className)}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              aria-label={ariaLabel}
              className={cn(
                // min-h-11 = 44px, the WCAG touch-target floor. min-h-9 (36px) shipped here
                // for six apps while the landing picker next to it used 44px.
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-neutral-6 bg-neutral-1 px-2.5 py-1.5",
                "text-sm font-medium text-neutral-11 shadow-sm transition-[background-color,border-color,color,box-shadow]",
                "hover:border-neutral-7 hover:bg-neutral-2 hover:text-neutral-12",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                "disabled:pointer-events-none disabled:opacity-50",
                open && "border-neutral-8 bg-neutral-2 text-neutral-12",
              )}
            >
              <Globe className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="max-w-[6.5rem] truncate tracking-wide">{displayLocale(locale)}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-neutral-10 transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            aria-label={menuAriaLabel}
            // Opaque, not the DS frosted default. `bg-popover/95 + backdrop-blur`
            // reads fine over ordinary content but bleeds through over a large
            // high-contrast headline — the language list is a reading surface,
            // so it gets a solid background.
            className="w-[min(100vw-2rem,18rem)] overflow-hidden border-neutral-7 bg-neutral-1 p-0 shadow-xl backdrop-blur-none"
          >
            <Command className="rounded-[inherit] border-0 bg-transparent shadow-none">
              {showSearch ? (
                <CommandInput placeholder={searchPlaceholder} className="h-10" />
              ) : null}
              {/* overscroll-contain stops the wheel chaining to the document
                  once the list hits its end — without it the whole page scrolls
                  underneath an open picker. */}
              <CommandList className="max-h-72 overscroll-contain">
                <CommandEmpty className="py-8 text-sm text-muted-foreground">
                  {noResultsLabel}
                </CommandEmpty>

                {activeLocale ? (
                  <CommandGroup>{renderItem(activeLocale, { pinned: true })}</CommandGroup>
                ) : null}

                {activeLocale && otherLocales.length > 0 ? <CommandSeparator /> : null}

                {otherLocales.length > 0 ? (
                  <CommandGroup heading={activeLocale ? allLanguagesLabel : undefined}>
                    {otherLocales.map((l) => renderItem(l))}
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  LocaleSwitcher.displayName = "LocaleSwitcher";
  return LocaleSwitcher;
}
