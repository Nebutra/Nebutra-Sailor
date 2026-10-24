/** The reader's time zone travels in a cookie so the server renders their local time — no hydration swap. */
export const TIME_ZONE_COOKIE = "ns_tz";

export function validTimeZone(value: string | null | undefined): string | null {
  if (!value || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

/** Only same-site paths may be redirect targets. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
