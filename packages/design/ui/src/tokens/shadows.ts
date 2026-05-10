/**
 * Shadow Token System
 *
 * Geist-style elevation scale: xs → 2xl + brand glow variants.
 * CSS variables (--elevation-*) are defined in globals.css with
 * automatic light / dark mode switching.
 *
 * @see packages/design/ui/src/styles/globals.css  @theme inline
 * @see apps/landing-page/DESIGN.md Section 10.10
 */

/**
 * Ordered elevation scale — lowest → highest
 */
export const shadowScale = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
export const shadowBrandScale = ["brand", "brand-lg"] as const;

/**
 * Tailwind shadow class references (dark-mode aware via CSS variables).
 *
 * Semantic mapping:
 *   xs       → hovered rows, focused input rings
 *   sm       → cards, tooltips
 *   md       → dropdowns, popovers
 *   lg       → sticky headers, floating panels
 *   xl       → modals, dialogs
 *   2xl      → top-level overlays
 *   brand    → ring + glow using 云毓蓝 (primary)
 *   brand-lg → stronger brand glow (hero CTAs, featured cards)
 *
 * @example
 *   <div className={shadowClasses.md}>…</div>
 */
export const shadowClasses = {
  none: "shadow-none",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  brand: "shadow-brand",
  "brand-lg": "shadow-brand-lg",
} as const;

/**
 * CSS variable references for inline styles or JS/Framer Motion animations.
 * Values resolve automatically for the current light/dark theme.
 *
 * @example
 *   style={{ boxShadow: shadowVars.md }}
 *   animate={{ boxShadow: shadowVars.brand }}
 */
export const shadowVars = {
  none: "none",
  xs: "var(--elevation-xs)",
  sm: "var(--elevation-sm)",
  md: "var(--elevation-md)",
  lg: "var(--elevation-lg)",
  xl: "var(--elevation-xl)",
  "2xl": "var(--elevation-2xl)",
  brand: "var(--elevation-brand)",
  "brand-lg": "var(--elevation-brand-lg)",
} as const;

export type ShadowLevel = (typeof shadowScale)[number];
export type ShadowBrand = (typeof shadowBrandScale)[number];
export type ShadowKey = keyof typeof shadowClasses;
