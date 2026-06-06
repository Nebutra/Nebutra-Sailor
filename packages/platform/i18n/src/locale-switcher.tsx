"use client";

import { Check, Globe } from "@nebutra/icons";
import { useLocale } from "next-intl";
import { useCallback, useRef, useState, useTransition } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Use a loose router interface so this module stays compatible with both
// apps/landing-page's local routing (7-locale union) and @nebutra/i18n/routing
// (2-locale union). The canonical component calls replace/prefetch with the
// TLocale string; each app's concrete router accepts its own locale union.
// biome-ignore lint/suspicious/noExplicitAny: intentional loose adapter
export interface LocaleSwitcherHooks {
  // biome-ignore lint/suspicious/noExplicitAny: loose adapter for multi-locale routers
  useRouter: () => any;
  usePathname: () => string;
}

export interface LocaleSwitcherConfig<TLocale extends string> {
  locales: readonly TLocale[];
  /**
   * Static label map OR a hook that returns labels at render time.
   * Use a hook when labels come from useTranslations (e.g. in apps/web).
   */
  labels: Record<TLocale, string> | (() => Record<TLocale, string>);
  /**
   * Optional hook that returns the aria-label for the trigger button.
   * When omitted, defaults to "Change language".
   */
  useAriaLabel?: () => string;
}

export interface LocaleSwitcherProps<TLocale extends string = string> {
  /** Override the aria-label on the trigger button. Defaults to "Change language". */
  ariaLabel?: string;
  /** Override locale labels at render time (e.g. from useTranslations). */
  labels?: Partial<Record<TLocale, string>>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Cookie helper
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setLocaleCookie(locale: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * createLocaleSwitcher
 *
 * Returns a fully-wired LocaleSwitcher component that:
 *   1. Uses useTransition so the trigger is disabled while the navigation is pending.
 *   2. Calls router.replace (never push) to avoid polluting the back stack.
 *   3. Writes the NEXT_LOCALE cookie for CDN/middleware edge affinity.
 *   4. Prefetches every non-active locale route when the dropdown opens.
 *
 * Each app passes its own routing-module hooks so the component stays
 * independent of the routing configuration (localePrefix "always" vs "as-needed",
 * locale set, etc.).
 *
 * @example
 * // apps/web — uses @nebutra/i18n/routing
 * import { useRouter, usePathname } from "@nebutra/i18n/routing";
 * export const LocaleSwitcher = createLocaleSwitcher(
 *   { useRouter, usePathname },
 *   { locales: ["en", "zh"], labels: { en: "English", zh: "中文" } },
 * );
 */
export function createLocaleSwitcher<TLocale extends string>(
  hooks: LocaleSwitcherHooks,
  config: LocaleSwitcherConfig<TLocale>,
) {
  const { useRouter, usePathname } = hooks;
  const { locales, labels: labelsOrHook, useAriaLabel } = config;

  function LocaleSwitcher({
    ariaLabel: ariaLabelProp,
    labels: labelsProp,
    className,
  }: LocaleSwitcherProps<TLocale> = {}) {
    const locale = useLocale() as TLocale;
    // Resolve labels — prop override > static map or hook result.
    const configLabels = typeof labelsOrHook === "function" ? labelsOrHook() : labelsOrHook;
    const labels: Record<TLocale, string> = labelsProp
      ? ({ ...configLabels, ...labelsProp } as Record<TLocale, string>)
      : configLabels;
    // Resolve aria-label — prop > config hook > default.
    const defaultAriaLabel = useAriaLabel ? useAriaLabel() : "Change language";
    const ariaLabel = ariaLabelProp ?? defaultAriaLabel;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prefetch all non-active locales when dropdown opens so the navigation
    // feels instant. This also warms on-demand non-default-locale pages under
    // the "as-needed" prefix strategy.
    // Guard: some test mocks / older router adapters may not expose .prefetch.
    const handleOpen = useCallback(() => {
      setOpen((prev) => {
        if (!prev && typeof router.prefetch === "function") {
          for (const l of locales) {
            if (l !== locale) {
              router.prefetch(pathname, { locale: l });
            }
          }
        }
        return !prev;
      });
    }, [locale, pathname, router]);

    const handleSelect = useCallback(
      (next: TLocale) => {
        if (next === locale) {
          setOpen(false);
          return;
        }
        setLocaleCookie(next);
        setOpen(false);
        startTransition(() => {
          router.replace(pathname, { locale: next });
        });
      },
      [locale, pathname, router],
    );

    // Close on outside click / Escape
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    }, []);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
      if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
        setOpen(false);
      }
    }, []);

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
          disabled={isPending}
          onClick={handleOpen}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:opacity-50"
        >
          <Globe className="h-4 w-4" aria-hidden />
          <span className="uppercase">{locale}</span>
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Select language"
            className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-1 p-1 shadow-lg"
          >
            {locales.map((l) => {
              const isActive = l === locale;
              return (
                <button
                  key={l}
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? ("true" as const) : undefined}
                  onClick={() => handleSelect(l)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2"
                >
                  <span>{labels[l]}</span>
                  {isActive && <Check className="h-3.5 w-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  LocaleSwitcher.displayName = "LocaleSwitcher";
  return LocaleSwitcher;
}
