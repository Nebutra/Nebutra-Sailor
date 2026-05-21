/**
 * Shared form-control interaction classes.
 *
 * Contract:
 * - Native outline is always owned by the design system.
 * - Strong focus treatment is keyboard-only via focus-visible.
 * - Invalid state keeps a persistent border, with ring escalation only on
 *   focus-visible so mouse focus does not look like keyboard navigation.
 */

type FormControlSlot = "input" | "textarea" | "select";

export const formControlFocusClassNames = {
  input:
    "outline-none focus-visible:border-ring focus-visible:ring-[length:var(--input-focus-ring-width)] focus-visible:ring-ring/30",
  textarea:
    "outline-none focus-visible:border-ring focus-visible:ring-[length:var(--textarea-focus-ring-width)] focus-visible:ring-ring/30",
  select:
    "outline-none focus-visible:border-ring focus-visible:ring-[length:var(--select-focus-ring-width)] focus-visible:ring-ring/30",
} as const satisfies Record<FormControlSlot, string>;

export const formControlInvalidClassNames = {
  input:
    "aria-invalid:border-destructive/60 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20",
  textarea:
    "aria-invalid:border-destructive/60 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20",
  select:
    "aria-invalid:border-destructive/60 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20",
} as const satisfies Record<FormControlSlot, string>;
