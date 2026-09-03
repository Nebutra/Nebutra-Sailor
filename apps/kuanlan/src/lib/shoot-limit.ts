import { TokenBucket } from "@nebutra/rate-limit";

/**
 * Two ceilings per person, both in front of the 302.ai call.
 *
 * Until this app has credits (see docs/plans/2026-09-03-kuanlan-productization-roadmap.md),
 * these buckets are the only thing between one signed-in session and an
 * unbounded bill: every user shares a single `ROUTER_API_KEY`, and 观澜 does not
 * pass through the gateway, so the platform's balance guard is not in this path.
 *
 * The buckets live in this process. That is a real limit for the current
 * deployment — `infra/fly/kuanlan.toml` keeps exactly one machine running — but
 * a restart hands everyone a fresh allowance. The shape below is what
 * `RedisTokenBucket` from `@nebutra/rate-limit` swaps into unchanged on the day
 * 观澜 runs on more than one machine.
 *
 * A shot that fails does NOT return its token. Erring toward under-serving is
 * the safe direction while nothing else bounds the spend; proper
 * no-output-no-charge arrives with credits, which can actually refund.
 */

/** Shots per minute. Bounds concurrency and stops a stuck retry loop. */
export const DEFAULT_BURST_PER_MINUTE = 3;

/** Shots per day. This is the spend cap. */
export const DEFAULT_DAILY = 20;

const MINUTE = 60_000;
const DAY = 86_400_000;

export type ShootLimitScope = "burst" | "daily";

export type ShootAllowance = {
  allowed: boolean;
  /** Shots left today once this one is counted. */
  remaining: number;
  /** Which ceiling refused, when one did. */
  scope?: ShootLimitScope;
  /** Seconds until the refused ceiling has room again. */
  retryAfter?: number;
};

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type Buckets = { burst: TokenBucket; daily: TokenBucket };
let buckets: Buckets | null = null;

function limits(): Buckets {
  if (!buckets) {
    const burstMax = positiveInt(process.env.KUANLAN_SHOOT_BURST, DEFAULT_BURST_PER_MINUTE);
    const dailyMax = positiveInt(process.env.KUANLAN_SHOOT_DAILY, DEFAULT_DAILY);
    buckets = {
      burst: new TokenBucket({
        maxTokens: burstMax,
        refillRate: burstMax,
        refillInterval: MINUTE,
      }),
      daily: new TokenBucket({
        maxTokens: dailyMax,
        refillRate: dailyMax,
        refillInterval: DAY,
      }),
    };
  }
  return buckets;
}

/**
 * Spend one shot's allowance.
 *
 * The burst ceiling is checked first on purpose: it refills within the minute,
 * so a request refused by the daily ceiling costs the caller a burst token it
 * gets back almost immediately, rather than the other way round.
 */
export async function spendShootAllowance(userId: string): Promise<ShootAllowance> {
  const { burst, daily } = limits();

  const perMinute = await burst.consume(userId);
  if (!perMinute.allowed) {
    return {
      allowed: false,
      remaining: 0,
      scope: "burst",
      retryAfter: perMinute.retryAfter ?? 60,
    };
  }

  const perDay = await daily.consume(userId);
  if (!perDay.allowed) {
    return {
      allowed: false,
      remaining: 0,
      scope: "daily",
      retryAfter: perDay.retryAfter ?? 3600,
    };
  }

  return { allowed: true, remaining: perDay.remaining };
}

/** Drop the buckets so a test (or a config change) starts from a clean slate. */
export function resetShootLimits(): void {
  buckets = null;
}
