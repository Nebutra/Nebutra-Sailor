/**
 * Auth surface layout contracts.
 *
 * Split-shell login (apps/auth + apps/web) and the marketing AuthPage must
 * share one form-column width. Inventing a second max-width on either shell
 * is how the credentials column drifts wider than the design (e.g. the
 * historical 440px one-off that shipped on auth-center).
 *
 * `max-w-sm` = 24rem / 384px — form-scale, not page-scale. Matches the
 * credentials column on Marketing/AuthPage.
 */
export const AUTH_FORM_COLUMN_CLASS = "relative w-full max-w-sm";

/**
 * Primary auth CTA sizing. Pair with `variant="ink"` on Button — never fight
 * `btn-brand-default`'s background-image with `bg-[hsl(var(--foreground))]`.
 * The image layer wins and the identity/action blue reappears on the first
 * surface a visitor touches.
 */
export const AUTH_PRIMARY_CTA_CLASS = "h-11 w-full";
