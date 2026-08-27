const GLOBAL_RATE_LIMIT_SKIP_PREFIXES = [
  "/api/misc",
  "/api/system",
  "/misc",
  "/system",
  "/api/auth",
  "/api/organizations",
  "/api/webhooks",
  "/api/queue",
  "/api/inngest",
  // Pebble intake is unauthenticated, so the global limiter would bucket every
  // desktop user together under "anonymous". These routes carry their own
  // per-IP limits instead — see routes/pebble/rate-limit.ts.
  "/api/pebble",
] as const;

export function shouldSkipGlobalRateLimit(path: string): boolean {
  return GLOBAL_RATE_LIMIT_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}
