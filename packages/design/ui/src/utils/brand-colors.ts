/**
 * Runtime color resolution for APIs that cannot consume CSS variables
 * (Canvas, WebGL, some animation libs).
 *
 * Product chrome: prefer getProductPrimary() → semantic --primary
 * Brand identity: getBrandPrimary() → VI --brand-primary (logo / lockup only)
 *
 * Prefer CSS `hsl(var(--primary))` / Tailwind `bg-primary` in components.
 * @see packages/design/ARCHITECTURE.md
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

/** VI lock color — logo / brand assets only. */
export function getBrandPrimary(): string {
  return asCssVarColor("--brand-primary", BRAND_FALLBACK.primary);
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
