"use client";

import { Check, Globe } from "@nebutra/icons";
import { useLocale } from "next-intl";
import { useCallback, useRef, useState, useTransition } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Use a loose router interface so this module stays compatible with both local
// app routing modules and @nebutra/i18n/routing. They can expose different
// locale unions; each concrete router accepts its own locale union.
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
  /**
   * Switching behaviour.
   *
   * - `"path"` (default) — locale-aware router.replace(pathname, {locale})
   *   + prefetch on dropdown open. Landing page stays on this mode.
   * - `"cookie"` — writes the NEXT_LOCALE cookie then calls router.refresh().
   *   No URL change, no prefetch. Correct for apps/web (cookie-based i18n).
   *
   * Callers that do not pass mode get "path" so existing usage is unchanged.
   */
  mode?: "path" | "cookie";
  /** Compact code shown inside the trigger. Defaults to the locale value. */
  displayLocale?: (locale: TLocale) => string;
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

function useDefaultAriaLabel(): string {
  return "Change language";
}

function setLocaleCookie(locale: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Scroll preservation
// ---------------------------------------------------------------------------

/**
 * A language switch is the *same* page in another language — the reader must
 * stay exactly where they were. `scroll: false` on router.replace handles
 * Next's own scroll restoration, but it is not enough on its own: switching
 * locale re-mounts the localized subtree, which re-mounts every `AnimateIn`
 * entrance animation. Motion's keyframe resolver (`measureAllKeyframes`)
 * saves-and-restores `window` scroll while it measures, and on a tall page it
 * restores to the wrong offset — yanking the viewport to the bottom (the
 * footer). This was the real cause of the "switching language jumps to the
 * footer" bug, independent of `scroll: false`.
 *
 * `pinScrollPosition` captures the offset at select time and re-asserts it for
 * a short window across the navigation commit + Motion's measurement burst,
 * using instant (never smooth) scrolls so it can't fight a global
 * `scroll-behavior: smooth`. It bails the moment the reader expresses scroll
 * intent (wheel / touch / arrow keys), so it never traps a user who decides to
 * scroll mid-switch.
 */
function pinScrollPosition(durationMs = 2500): void {
  if (typeof window === "undefined") return;
  const targetX = window.scrollX;
  const targetY = window.scrollY;
  const start = performance.now();
  let active = true;

  // Re-assert the offset the instant any code (Motion's measurement) moves the
  // window. The scroll listener fires synchronously after the offending
  // scrollTo, before paint, so the misplaced frame never renders. User scroll
  // intent (wheel/touch/pointer/keys) releases the pin *before* its scroll
  // event, so this never fights the reader. Restoring to the same offset is a
  // no-op and cannot loop. (Function declarations: hoisted so the listeners
  // can reference each other regardless of order.)
  function correct() {
    if (!active) return;
    if (window.scrollX !== targetX || window.scrollY !== targetY) {
      window.scrollTo({ left: targetX, top: targetY, behavior: "instant" as ScrollBehavior });
    }
  }
  function stop() {
    if (!active) return;
    active = false;
    window.removeEventListener("wheel", release);
    window.removeEventListener("touchmove", release);
    window.removeEventListener("pointerdown", release);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", correct);
  }
  function release() {
    stop();
  }
  function onKey(e: KeyboardEvent) {
    if (
      ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"].includes(e.key)
    ) {
      stop();
    }
  }
  window.addEventListener("wheel", release, { passive: true });
  window.addEventListener("touchmove", release, { passive: true });
  window.addEventListener("pointerdown", release, { passive: true });
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", correct, { passive: true });

  const tick = () => {
    if (!active) return;
    correct();
    if (performance.now() - start < durationMs) {
      requestAnimationFrame(tick);
    } else {
      stop();
    }
  };
  requestAnimationFrame(tick);
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
 * // apps/web — uses cookie mode and canonical locale values
 * export const LocaleSwitcher = createLocaleSwitcher(
 *   { useRouter, usePathname },
 *   {
 *     locales: ["en-US", "zh-Hans-CN"],
 *     labels: { "en-US": "English", "zh-Hans-CN": "中文" },
 *     displayLocale: (locale) => (locale === "zh-Hans-CN" ? "zh" : locale.slice(0, 2)),
 *   },
 * );
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
    displayLocale = (locale: TLocale) => locale,
    mode = "path",
  } = config;

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
    const defaultAriaLabel = useAriaLabel();
    const ariaLabel = ariaLabelProp ?? defaultAriaLabel;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prefetch all non-active locales when dropdown opens (path mode only).
    // In cookie mode there are no locale-specific URLs to prefetch.
    // Guard: some test mocks / older router adapters may not expose .prefetch.
    const handleOpen = useCallback(() => {
      setOpen((prev) => {
        if (!prev && mode === "path" && typeof router.prefetch === "function") {
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
        // Keep the reader exactly where they are across the re-mount. See
        // pinScrollPosition — Motion's keyframe measurement scrolls the window
        // on the localized subtree re-mount; this re-asserts the offset until it
        // settles. Applies to both modes (cookie-mode refresh re-mounts too).
        pinScrollPosition();
        if (mode === "cookie") {
          // Cookie mode: write cookie then re-run getRequestConfig server-side
          // via router.refresh(). No URL change, no navigation, instant switch.
          startTransition(() => {
            router.refresh();
          });
        } else {
          startTransition(() => {
            // scroll: false — a locale switch is the *same* page in another
            // language; the reader must stay exactly where they are. Pairs with
            // pinScrollPosition above to defeat Motion's measurement scroll.
            router.replace(pathname, { locale: next, scroll: false });
          });
        }
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
          <span className="uppercase">{displayLocale(locale)}</span>
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
