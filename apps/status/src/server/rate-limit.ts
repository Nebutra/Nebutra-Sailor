/**
 * In-memory sliding-window limits for the unauthenticated surfaces: sign-in,
 * first-run setup and public subscribe. A self-hosted instance is one process,
 * so memory is the right store; with several replicas each enforces its own
 * window, which still bounds an attacker to N × the limit.
 *
 * Limits are checked before any password work and every attempt is counted,
 * so a refused request costs the same whether or not the email exists.
 */

export interface Limit {
  /** Attempts allowed in the window. */
  max: number;
  windowMs: number;
}

export const LIMITS = {
  /** Every sign-in attempt from one address. */
  signInPerIp: { max: 30, windowMs: 15 * 60_000 },
  /** Failed sign-ins against one email, from anywhere. */
  signInFailuresPerEmail: { max: 10, windowMs: 15 * 60_000 },
  setupPerIp: { max: 10, windowMs: 15 * 60_000 },
  subscribePerIp: { max: 20, windowMs: 60 * 60_000 },
  /** Confirmation emails to one address. */
  subscribePerTarget: { max: 3, windowMs: 60 * 60_000 },
} satisfies Record<string, Limit>;

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private sweeps = 0;

  constructor(private readonly clock: () => number = Date.now) {}

  private recent(key: string, windowMs: number): number[] {
    const since = this.clock() - windowMs;
    const kept = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (kept.length === 0) this.hits.delete(key);
    else this.hits.set(key, kept);
    return kept;
  }

  /** Seconds until another attempt is allowed, or 0 when one is allowed now. */
  retryAfter(key: string, limit: Limit): number {
    const recent = this.recent(key, limit.windowMs);
    if (recent.length < limit.max) return 0;
    const oldest = recent[recent.length - limit.max] ?? this.clock();
    return Math.max(1, Math.ceil((oldest + limit.windowMs - this.clock()) / 1000));
  }

  hit(key: string): void {
    const list = this.hits.get(key) ?? [];
    list.push(this.clock());
    this.hits.set(key, list);
    if (++this.sweeps % 1000 === 0) this.sweep();
  }

  /** Count the attempt and say whether it may proceed. */
  take(key: string, limit: Limit): number {
    const wait = this.retryAfter(key, limit);
    if (wait === 0) this.hit(key);
    return wait;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Drop keys with nothing inside the longest window. */
  sweep(): void {
    const longest = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
    for (const key of [...this.hits.keys()]) this.recent(key, longest);
  }
}

export const limiter = new RateLimiter();

/**
 * The caller's address. Route handlers see no socket, so this reads the
 * proxy's headers: the instance is meant to sit behind one (nginx, a load
 * balancer). Set STATUS_TRUST_PROXY=off when it faces the internet directly,
 * and every caller shares one bucket rather than choosing their own.
 */
export function clientIp(request: Request): string {
  if (process.env.STATUS_TRUST_PROXY?.trim().toLowerCase() === "off") return "direct";
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(JSON.stringify({ error: "rate_limited", retryAfter: retryAfterSeconds }), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": String(retryAfterSeconds),
    },
  });
}
