/**
 * Passive quota-signal header parsing (ADR 2026-09-30 addendum — quota layer).
 *
 * Pure and DB-free, same posture as the rest of this package: given the
 * headers off a real upstream response, extract whatever rate-limit / usage
 * information the provider volunteered for free. The caller (`apps/router/src/
 * lib/supply/quota.ts`) turns a `QuotaHeaderSignal` into a `QuotaObservation`
 * (`./quota.ts`) and persists it through the repository seam — nothing here
 * touches a database or even knows what a "window" is; it only reads headers.
 */

export type QuotaHeaderUnit = "REQUESTS" | "TOKENS";

export interface QuotaHeaderSignal {
  /** e.g. "requests", "tokens", "input-tokens", "output-tokens" — provider vocabulary, not ours. */
  readonly name: string;
  readonly unit: QuotaHeaderUnit;
  readonly limit: number | null;
  readonly remaining: number | null;
  /** When the provider told us a reset time/duration. */
  readonly resetsAt: Date | null;
}

type HeaderSource = Headers | Record<string, string | null | undefined>;

function get(headers: HeaderSource, name: string): string | null {
  if (headers instanceof Headers) return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  return value ?? null;
}

function toNumber(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * OpenAI's reset-duration format: `6m0s`, `1s`, `250ms`, `1h4m`. No single
 * unit — this parses whichever of `h`/`m`/`s`/`ms` segments are present.
 */
export function parseOpenAiResetDuration(raw: string | null, now: Date = new Date()): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let totalMs = 0;
  let matched = false;
  for (const m of trimmed.matchAll(re)) {
    matched = true;
    const value = Number(m[1]);
    const unit = m[2];
    if (unit === "h") totalMs += value * 3_600_000;
    else if (unit === "m") totalMs += value * 60_000;
    else if (unit === "ms") totalMs += value;
    else if (unit === "s") totalMs += value * 1_000;
  }
  if (!matched) return null;
  return new Date(now.getTime() + totalMs);
}

/**
 * `retry-after`: either delta-seconds (`"120"`) or an HTTP-date
 * (`"Wed, 21 Oct 2026 07:28:00 GMT"`). Returns the resolved instant, or null
 * when the header is absent or unparseable.
 */
export function parseRetryAfter(headers: HeaderSource, now: Date = new Date()): Date | null {
  const raw = get(headers, "retry-after");
  if (!raw) return null;
  const trimmed = raw.trim();
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return new Date(now.getTime() + Math.max(0, seconds) * 1000);
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

/** `x-ratelimit-{limit,remaining}-{requests,tokens}` + `x-ratelimit-reset-{requests,tokens}`. */
export function parseOpenAiRateLimitHeaders(
  headers: HeaderSource,
  now: Date = new Date(),
): QuotaHeaderSignal[] {
  const signals: QuotaHeaderSignal[] = [];
  for (const [suffix, name, unit] of [
    ["requests", "requests", "REQUESTS"],
    ["tokens", "tokens", "TOKENS"],
  ] as const) {
    const limit = toNumber(get(headers, `x-ratelimit-limit-${suffix}`));
    const remaining = toNumber(get(headers, `x-ratelimit-remaining-${suffix}`));
    const resetsAt = parseOpenAiResetDuration(get(headers, `x-ratelimit-reset-${suffix}`), now);
    if (limit === null && remaining === null && resetsAt === null) continue;
    signals.push({ name, unit, limit, remaining, resetsAt });
  }
  return signals;
}

/**
 * `anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-{limit,remaining,reset}`.
 * Anthropic's reset headers are RFC3339 timestamps, no duration parsing needed.
 */
export function parseAnthropicRateLimitHeaders(headers: HeaderSource): QuotaHeaderSignal[] {
  const signals: QuotaHeaderSignal[] = [];
  for (const [suffix, unit] of [
    ["requests", "REQUESTS"],
    ["tokens", "TOKENS"],
    ["input-tokens", "TOKENS"],
    ["output-tokens", "TOKENS"],
  ] as const) {
    const limit = toNumber(get(headers, `anthropic-ratelimit-${suffix}-limit`));
    const remaining = toNumber(get(headers, `anthropic-ratelimit-${suffix}-remaining`));
    const resetRaw = get(headers, `anthropic-ratelimit-${suffix}-reset`);
    const resetMs = resetRaw ? Date.parse(resetRaw) : Number.NaN;
    const resetsAt = Number.isNaN(resetMs) ? null : new Date(resetMs);
    if (limit === null && remaining === null && resetsAt === null) continue;
    signals.push({ name: suffix, unit, limit, remaining, resetsAt });
  }
  return signals;
}

/**
 * Every recognized signal off one response, OpenAI-shaped and Anthropic-shaped
 * headers both checked (a relay may forward either, or neither).
 */
export function parseUsageHeaders(
  headers: HeaderSource,
  now: Date = new Date(),
): QuotaHeaderSignal[] {
  return [...parseOpenAiRateLimitHeaders(headers, now), ...parseAnthropicRateLimitHeaders(headers)];
}

/**
 * The header-less-429 case: many plain relay APIs send nothing but
 * `retry-after` on a rate limit — no ratio data, just "blocked until". Returns
 * null when the status was not 429 or there is nothing to read.
 */
export function parseForceExhaustedUntil(
  status: number,
  headers: HeaderSource,
  now: Date = new Date(),
): Date | null {
  if (status !== 429) return null;
  return parseRetryAfter(headers, now);
}
