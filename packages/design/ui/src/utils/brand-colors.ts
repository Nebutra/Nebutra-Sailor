/**
 * Brand Color Utilities
 *
 * Resolves Nebutra brand CSS variables at runtime for components that
 * require raw hex values (e.g. WebGL shaders, Canvas APIs, animation libraries
 * that can't consume `var(--token)` strings directly).
 *
 * Components that accept CSS color strings (inline styles, gradients, SVG)
 * should prefer `var(--brand-primary)` / `var(--brand-accent)` directly
 * instead of calling these helpers.
 */

/** SSR / no-DOM fallbacks — only used when `window` is unavailable. */
export const BRAND_FALLBACK = {
  primary: "#0033FE", // nebutra-blue-500
  accent: "#0BF1C3", // nebutra-cyan-500
  tertiary: "#5c7cfa", // nebutra-blue-400
  primaryDark: "#002ad4", // nebutra-blue-600
  backDark: "#000830", // nebutra-blue-950
} as const;

/**
 * Read a CSS variable from :root and return its trimmed value.
 * Falls back to `fallback` in SSR/no-DOM environments or when the var
 * is unresolved (empty string).
 */
export function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Resolve `--brand-primary` to a hex/color string (with SSR fallback). */
export function getBrandPrimary(): string {
  return readCssVar("--brand-primary", BRAND_FALLBACK.primary);
}

/** Resolve `--brand-accent` to a hex/color string (with SSR fallback). */
export function getBrandAccent(): string {
  return readCssVar("--brand-accent", BRAND_FALLBACK.accent);
}

/** Resolve `--brand-tertiary` to a hex/color string (with SSR fallback). */
export function getBrandTertiary(): string {
  return readCssVar("--brand-tertiary", BRAND_FALLBACK.tertiary);
}
