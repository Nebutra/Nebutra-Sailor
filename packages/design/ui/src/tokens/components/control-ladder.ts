/**
 * The one control ladder every form control reads.
 *
 * `recipe.css` declares `--control-height-{tiny,sm,md,lg}`,
 * `--control-font-size-*` and `--radius-inputs`, and a Brand Package moves them
 * (compact languages run 20/28/32/40, Vanta and GSAP give fields a pill). Button
 * read that ladder; Input, Select, Combobox, Textarea, Switch and Tabs each
 * pinned their own pixel table in JS and wrote it inline. Measured on
 * 2026-10-10 across the nine languages: under Linear, GSAP, Raycast and Vercel
 * a default Button sat 8px shorter than the Input beside it, and under Vanta a
 * form row read input 6px / select 6px / combobox 999px / button 999px.
 *
 * These helpers return the token with the old pixel value as its fallback, so a
 * page without recipe.css renders exactly what it did before and a page with a
 * skin finally follows it.
 */

export type ControlStep = "tiny" | "sm" | "md" | "lg";

/** `var(--control-height-<step>, <fallback>px)`. */
export function controlHeight(step: ControlStep, fallbackPx: number): string {
  return `var(--control-height-${step}, ${fallbackPx}px)`;
}

/** `var(--control-font-size-<step>, <fallback>px)`. */
export function controlFontSize(step: ControlStep, fallbackPx: number): string {
  return `var(--control-font-size-${step}, ${fallbackPx}px)`;
}

/**
 * Corner of a single-line field. One radius for every size: a large field and a
 * small one in the same language share a corner, the way Geist and Radix do.
 */
export function fieldRadius(fallbackPx: number): string {
  return `var(--radius-inputs, ${fallbackPx}px)`;
}

/**
 * Corner of a multi-line field. A pill is a single-line decision; a textarea
 * under Vanta (999px fields) would otherwise come out as a lozenge, so the
 * corner stops at the language's card radius.
 */
export function multilineFieldRadius(fallbackPx: number): string {
  return `min(var(--radius-inputs, ${fallbackPx}px), var(--radius-card, 0.75rem))`;
}
