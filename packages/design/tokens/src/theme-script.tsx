/**
 * Theme initialization — FOUC-prevention script source.
 *
 * Returns the JavaScript source for an inline script that reads the user's
 * saved theme from `localStorage` and applies it to `<html>` BEFORE the
 * first paint. Consumers wrap this in whatever script-injection mechanism
 * their framework provides:
 *
 * ```tsx
 * // Next.js App Router (recommended — bypasses the React 19 + Turbopack
 * // "scripts inside React components" warning):
 * import Script from "next/script";
 * import { buildThemeInitScript } from "@nebutra/tokens";
 *
 * <Script id="theme-init" strategy="beforeInteractive">
 *   {buildThemeInitScript({ storageKey: "theme" })}
 * </Script>
 * ```
 *
 * Why a string, not a component:
 * React 19 emits a dev-mode console error for any `<script>` element in
 * the rendered JSX tree ("Scripts inside React components are never
 * executed when rendering on the client") — regardless of whether the
 * parent is a Server or Client Component. Returning a string lets each
 * consumer pick a framework-canonical injection path that side-steps
 * React's render pipeline (e.g. `next/script` `beforeInteractive`, which
 * Next.js hoists into the HTML response itself).
 *
 * Pairs with the {@link ThemeProvider} client component — both read the
 * same `localStorage` key and apply the same `<html>` attribute.
 */

export interface BuildThemeInitScriptOptions {
  /** localStorage key. Default: `"theme"` — matches `<ThemeProvider>`. */
  storageKey?: string;
  /** Which `<html>` attribute to set. Default: `"class"`. */
  attribute?: "class" | "data-theme";
  /** Default theme when nothing is stored. Default: `"system"`. */
  defaultTheme?: "light" | "dark" | "system";
}

const DEFAULT_STORAGE_KEY = "theme";
const DEFAULT_ATTRIBUTE: "class" | "data-theme" = "class";
const DEFAULT_THEME: "light" | "dark" | "system" = "system";

export function buildThemeInitScript({
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = DEFAULT_ATTRIBUTE,
  defaultTheme = DEFAULT_THEME,
}: BuildThemeInitScriptOptions = {}): string {
  const apply =
    attribute === "class"
      ? `r.classList.remove("light","dark");r.classList.add(t);`
      : `r.setAttribute("data-theme",t);`;
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(storageKey)})||${JSON.stringify(defaultTheme)};var t=s==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):s;var r=document.documentElement;${apply}r.style.colorScheme=t;}catch(e){}})();`;
}
