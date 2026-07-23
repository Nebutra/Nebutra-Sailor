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

/** SSR fallbacks when document is unavailable */
export const BRAND_FALLBACK = {
  /** VI 云毓蓝 — identity only */
  primary: "#0033FE",
  accent: "#0BF1C3",
  tertiary: "#5c7cfa",
  primaryDark: "#002ad4",
  backDark: "#000830",
  /** Soft product action (matches themes/light --primary ≈ #254bfa) */
  productPrimary: "#254bfa",
  /**
   * Brand mark fallback (= product action when factory brand has action≡brand).
   * Skins may diverge (e.g. Linear purple action + indigo mark).
   */
  brandMark: "#254bfa",
  brandMarkForeground: "#ffffff",
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
  return asCssColor(readCssVar("--primary", "228 85% 56%"), BRAND_FALLBACK.productPrimary);
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
  const raw = readCssVar("--brand-mark", "228 85% 56%");
  // Factory recipe defaults `--brand-mark: var(--primary)` — resolve to action color.
  if (/var\(\s*--primary\s*\)/u.test(raw)) {
    return getProductPrimary();
  }
  return asCssColor(raw, BRAND_FALLBACK.brandMark);
}

/** Foreground on brand-mark surfaces. */
export function getBrandMarkForeground(): string {
  const raw = readCssVar("--brand-mark-foreground", "0 0% 100%");
  if (/var\(\s*--primary-foreground\s*\)/u.test(raw)) {
    return asCssColor(
      readCssVar("--primary-foreground", "0 0% 100%"),
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
