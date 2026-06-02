/**
 * Money helpers. Monetary conversions go through integer cents to avoid binary
 * floating-point drift.
 */

/**
 * Convert a dollar amount to integer cents, compensating for binary-float drift
 * (e.g. `1.005 * 100 === 100.4999…`, which a bare `Math.round` truncates to 100).
 * Rounding the pre-scaled value at fixed precision first yields correct
 * round-half-up cents.
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(Number((dollars * 100).toFixed(4)));
}
