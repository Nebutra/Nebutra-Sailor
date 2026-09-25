/**
 * Runtime color resolution for APIs that cannot consume CSS variables
 * (Canvas, WebGL, some animation libs).
 *
 * Layers (do not mix):
 * - Product action / CTA: getProductPrimary() → semantic `--primary` (roles.action)
 * - Brand mark / AI badge / logo tint: getBrandMark() → `--brand-mark` (roles.brand)
 * - VI lock (print / legal assets): getBrandPrimary() → `--brand-primary` hex
 *
 * Prefer CSS / Tailwind in components:
 * - `bg-primary` for CTAs
 * - `bg-brand-mark` / `text-brand-mark` for Logo/AI badge (see recipe.css)
 *
 * @see packages/design/ARCHITECTURE.md
 * @see packages/design/tokens/recipe.css
 */

import { tokenColor, tokenValue } from "@nebutra/tokens/values";

/**
 * SSR fallbacks when document is unavailable — the light-mode token values,
 * read from @nebutra/tokens/values rather than restated. Hand-copied, these
 * had drifted: the product action was still the old blue after --primary
 * became ink (a shader painted blue on the server and flipped to ink on
 * hydration) and tertiary named a colour --brand-tertiary does not hold.
 */
export const BRAND_FALLBACK = {
  /** VI 云毓蓝 — identity only */
  primary: tokenColor("--brand-primary"),
  accent: tokenColor("--brand-accent"),
  tertiary: tokenColor("--brand-tertiary"),
  primaryDark: tokenColor("--nebutra-blue-600"),
  backDark: tokenColor("--nebutra-blue-950"),
  /** Product action — semantic --primary */
  productPrimary: tokenColor("--primary"),
  /**
   * Brand mark fallback (= product action: the factory recipe sets
   * --brand-mark: var(--primary)). Skins may diverge.
   */
  brandMark: tokenColor("--primary"),
  brandMarkForeground: tokenColor("--primary-foreground"),
} as const;

/**
 * Read a CSS variable from :root and return its trimmed value.
 */
export function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Turn HSL channel triple or full color into a CSS color string. */
function asCssColor(value: string, fallback: string): string {
  const v = value.trim() || fallback;
  if (
    v.startsWith("#") ||
    v.startsWith("rgb") ||
    v.startsWith("hsl") ||
    v.startsWith("oklch") ||
    v.startsWith("color(")
  ) {
    return v;
  }
  // shadcn-style "228 85% 56%"
  return `hsl(${v})`;
}

/**
 * Product action color — follows the active skin (`--primary`).
 * Use for shaders/canvas that must match buttons/CTAs.
 */
export function getProductPrimary(): string {
  return asCssColor(
    readCssVar("--primary", tokenValue("--primary")),
    BRAND_FALLBACK.productPrimary,
  );
}

/** VI lock color — legal / print lockups only (not product chrome). */
export function getBrandPrimary(): string {
  return asCssVarColor("--brand-primary", BRAND_FALLBACK.primary);
}

/**
 * Product brand-mark (roles.brand) — Logo tile, AI badge, identity chips.
 * Never use for default CTA (that is getProductPrimary / --primary).
 */
export function getBrandMark(): string {
  const raw = readCssVar("--brand-mark", tokenValue("--primary"));
  // Factory recipe defaults `--brand-mark: var(--primary)` — resolve to action color.
  if (/var\(\s*--primary\s*\)/u.test(raw)) {
    return getProductPrimary();
  }
  return asCssColor(raw, BRAND_FALLBACK.brandMark);
}

/** Foreground on brand-mark surfaces. */
export function getBrandMarkForeground(): string {
  const raw = readCssVar("--brand-mark-foreground", tokenValue("--primary-foreground"));
  if (/var\(\s*--primary-foreground\s*\)/u.test(raw)) {
    return asCssColor(
      readCssVar("--primary-foreground", tokenValue("--primary-foreground")),
      BRAND_FALLBACK.brandMarkForeground,
    );
  }
  return asCssColor(raw, BRAND_FALLBACK.brandMarkForeground);
}

function asCssVarColor(name: string, fallback: string): string {
  return asCssColor(readCssVar(name, fallback), fallback);
}

export function getBrandAccent(): string {
  return asCssVarColor("--brand-accent", BRAND_FALLBACK.accent);
}

export function getBrandTertiary(): string {
  return asCssVarColor("--brand-tertiary", BRAND_FALLBACK.tertiary);
}
