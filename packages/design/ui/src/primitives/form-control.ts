/**
 * Shared form-control interaction classes.
 *
 * Contract:
 * - Native outline is always owned by the design system.
 * - Text-like controls draw their tokenized control ring on :focus so mouse
 *   focus cannot leak native square outlines.
 * - Keyboard-only emphasis remains the default pattern for non-text controls.
 * - Invalid state keeps a persistent border, with ring escalation on :focus.
 */

type FormControlSlot = "input" | "textarea" | "select";

export const formControlFocusClassNames = {
  input:
    "outline-none focus:border-ring focus:ring-[length:var(--input-focus-ring-width)] focus:ring-ring/30",
  textarea:
    "outline-none focus:border-ring focus:ring-[length:var(--textarea-focus-ring-width)] focus:ring-ring/30",
  select:
    "outline-none focus:border-ring focus:ring-[length:var(--select-focus-ring-width)] focus:ring-ring/30",
} as const satisfies Record<FormControlSlot, string>;

export const formControlInvalidClassNames = {
  input:
    "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
  textarea:
    "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
  select:
    "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
} as const satisfies Record<FormControlSlot, string>;

/**
 * Keyboard focus for controls drawn by a proxy: checkbox, radio, switch, toggle.
 *
 * Those controls hide the real <input> (`peer sr-only`) and paint a sibling
 * span. The global :focus-visible outline in design-tokens/static/base.css
 * lands on the hidden input, which is 1px and clipped — so keyboard focus was
 * invisible on every one of them (the radio even set peer-focus-visible:
 * outline-none). This paints the same outline — 2px, --ring, 2px offset — on
 * the proxy instead. Not a second ring: the input's own outline is invisible.
 */
export const controlFocusProxyClassName =
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[hsl(var(--ring))]";
