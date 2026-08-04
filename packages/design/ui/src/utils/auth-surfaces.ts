/**
 * Auth surface layout contracts.
 *
 * ## Width (root cause)
 * Do NOT use `w-full max-w-sm|xs` alone inside a flex/grid shell. Percentage
 * width resolves against the full right pane (~64vw); if max-width is ever
 * soft-failed (token miss, cascade, min-width:auto content), the column
 * expands to the pane. Force the used width with min() + min-w-0 + shrink-0.
 *
 * 360px matches the Neon / Clerk login-card band (not page-form 24rem).
 *
 * ## OAuth (Neon)
 * Always a 2-column compact grid — never full-width stacked bars, never
 * "stack when only two providers". Buttons fill the *cell*, not the pane.
 */
export const AUTH_FORM_COLUMN_CLASS = "relative mx-auto min-w-0 w-[min(100%,360px)] shrink-0";

/** Optional card chrome — same width SSOT, visual containment like Neon. */
export const AUTH_FORM_CARD_CLASS =
  "rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8";

export const AUTH_PRIMARY_CTA_CLASS = "h-11 w-full";

/** Neon-style OAuth: always 2 columns, tight gap. */
export const AUTH_OAUTH_GRID_CLASS = "grid grid-cols-2 gap-2";

/** Compact OAuth chip — fills grid cell only. */
export const AUTH_OAUTH_BUTTON_CLASS =
  "h-9 w-full justify-center gap-2 border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-none hover:bg-muted";
