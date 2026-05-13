"use client";

/**
 * Custom ThemeProvider — replaces the upstream `next-themes` re-export.
 *
 * Why we own this: `next-themes@0.4.x` renders an inline `<script>` element
 * inside its Client-Component provider for FOUC prevention. React 19 +
 * Next.js 16 (Turbopack) now emit a console error when scripts appear
 * inside Client Components ("Scripts inside React components are never
 * executed when rendering on the client"). The script DID do its job at
 * SSR time, but the warning pollutes the dev console on every page load.
 *
 * Our architecture splits the two concerns cleanly:
 *   - {@link ThemeProvider}  (Client) — runtime state, OS sync, transitions
 *   - {@link ThemeScript}    (Server) — synchronous FOUC-prevention inline
 *                                       script rendered into the SSR HTML
 *
 * The API surface mirrors next-themes so the migration is a drop-in for
 * callers (same prop names: `attribute`, `defaultTheme`, `enableSystem`,
 * `disableTransitionOnChange`, `storageKey`, `nonce`).
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const THEMES = ["light", "dark", "system"] as const satisfies readonly Theme[];

/**
 * Shared default storage key. Matches what `next-themes` uses, so any user
 * who already has a saved preference keeps it across the migration.
 */
export const THEME_STORAGE_KEY = "theme";

interface ThemeContextValue {
  /** The raw user preference. May be "system". */
  theme: Theme;
  /** The concretely-applied theme — always "light" or "dark". */
  resolvedTheme: ResolvedTheme;
  /** The OS-level preference (always concrete). */
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  themes: readonly Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read the active theme state. Safe to call outside a provider — returns
 * a sane default in that case so consumers don't need to null-check.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    theme: "system",
    resolvedTheme: "light",
    systemTheme: "light",
    setTheme: () => {
      // no-op outside provider
    },
    themes: THEMES,
  };
}

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(storageKey);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage may be disabled (Safari private mode, etc.)
  }
  return fallback;
}

function applyThemeToDom(
  resolved: ResolvedTheme,
  attribute: "class" | "data-theme",
  disableTransitionOnChange: boolean,
) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Suppress CSS transitions during the swap so the change appears instant.
  if (disableTransitionOnChange) {
    const suppressor = document.createElement("style");
    suppressor.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none!important;animation-duration:0s!important}",
      ),
    );
    document.head.appendChild(suppressor);
    // Force a reflow so the rule applies before we swap classes
    void window.getComputedStyle(suppressor).opacity;
    // Remove the rule on the next tick; transitions resume afterwards
    setTimeout(() => {
      if (suppressor.parentNode) suppressor.parentNode.removeChild(suppressor);
    }, 1);
  }

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  } else {
    root.setAttribute("data-theme", resolved);
  }
  root.style.colorScheme = resolved;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Which DOM attribute to set on `<html>`. Default: `"class"`. */
  attribute?: "class" | "data-theme";
  /** Default theme when no preference is stored. Default: `"system"`. */
  defaultTheme?: Theme;
  /** Whether `"system"` is a valid theme that tracks `prefers-color-scheme`. */
  enableSystem?: boolean;
  /** Suppress CSS transitions during the swap. Default: `true`. */
  disableTransitionOnChange?: boolean;
  /** Storage key under which the preference is persisted. */
  storageKey?: string;
  /** CSP nonce — accepted for API compatibility, currently unused by client logic. */
  nonce?: string;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = true,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveSystemTheme());

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (enableSystem ? systemTheme : "light") : theme;

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        if (next === "system") {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, next);
        }
      } catch {
        // localStorage may be disabled — accept the loss
      }
    },
    [storageKey],
  );

  // Apply the resolved theme to the DOM whenever it changes
  useEffect(() => {
    applyThemeToDom(resolvedTheme, attribute, disableTransitionOnChange);
  }, [resolvedTheme, attribute, disableTransitionOnChange]);

  // Follow OS preference changes when in `system` mode
  useEffect(() => {
    if (!enableSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [enableSystem]);

  // Sync across tabs / windows
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = event.newValue;
      if (next === "light" || next === "dark" || next === "system") {
        setThemeState(next);
      } else if (next === null) {
        setThemeState(defaultTheme);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey, defaultTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
      themes: THEMES,
    }),
    [theme, resolvedTheme, systemTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
