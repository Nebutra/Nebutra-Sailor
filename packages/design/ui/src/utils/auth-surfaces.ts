/**
 * Auth surface layout contracts — **server-safe pure strings**.
 *
 * Consumed by RSC AuthSplitLayout. Built as `utils/auth-surfaces` without a
 * `"use client"` stamp (see packages/design/ui/tsup.config.ts SERVER_ONLY).
 * Prefer `import { … } from "@nebutra/ui/utils/auth-surfaces"` in server
 * layouts so a future utils barrel regression cannot client-proxy these again.
 *
 * ## Width (root cause)
 * Do NOT use `w-full max-w-sm|xs` alone inside a flex/grid shell. Percentage
 * width resolves against the full right pane (~64vw); if max-width is ever
 * soft-failed (token miss, cascade, min-width:auto content), the column
 * expands to the pane. Force the used width with min() + min-w-0 + shrink-0.
 *
 * 360px matches the Neon / Clerk login-card band (not page-form 24rem).
 *
 * ## No card chrome on split shell
 * Do NOT wrap the credentials column in border / rounded-2xl / shadow card.
 * Split already has a marketing panel + white form pane; a nested card is
 * double framing. Fields sit on the pane like Neon console login.
 *
 * ## OAuth
 * Always a 2-column compact grid — never full-width stacked bars, never
 * "stack when only two providers". Buttons fill the *cell*, not the pane.
 */
export const AUTH_FORM_COLUMN_CLASS = "relative mx-auto min-w-0 w-[min(100%,360px)] shrink-0";

export const AUTH_PRIMARY_CTA_CLASS = "h-11 w-full";

/** Compact OAuth: always 2 columns, tight gap. */
export const AUTH_OAUTH_GRID_CLASS = "grid grid-cols-2 gap-2";

/** Compact OAuth chip — fills grid cell only. */
export const AUTH_OAUTH_BUTTON_CLASS =
  "h-9 w-full justify-center gap-2 border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-none hover:bg-muted";
