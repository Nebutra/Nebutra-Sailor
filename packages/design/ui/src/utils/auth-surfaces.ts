/**
 * Auth surface layout contracts.
 *
 * Split-shell login (apps/auth + apps/web) and the marketing AuthPage must
 * share one form-column width. Inventing a second max-width on either shell
 * is how the credentials column drifts wider than the design (e.g. the
 * historical 440px one-off, then 384px max-w-sm that still felt wide with
 * dual OAuth side-by-side on a 64vw white pane).
 *
 * `max-w-xs` = 20rem / 320px — login-card scale (Clerk / Linear band), not
 * the looser page-form `max-w-sm` (24rem). Pair with single-column OAuth
 * when only two providers so controls do not stretch into empty pills.
 */
export const AUTH_FORM_COLUMN_CLASS = "relative w-full max-w-xs";

/**
 * Primary auth CTA sizing. Pair with `variant="ink"` on Button — never fight
 * `btn-brand-default`'s background-image with `bg-[hsl(var(--foreground))]`.
 * The image layer wins and the identity/action blue reappears on the first
 * surface a visitor touches.
 */
export const AUTH_PRIMARY_CTA_CLASS = "h-11 w-full";
