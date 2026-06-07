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
] as const;

export function shouldSkipGlobalRateLimit(path: string): boolean {
  return GLOBAL_RATE_LIMIT_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}
