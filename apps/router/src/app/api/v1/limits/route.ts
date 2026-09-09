import { getSystemDb } from "@nebutra/db";
import { RouterBillingRepository } from "@nebutra/repositories";
import { extractCredential, refuse } from "@/lib/openai-edge";
import { getApiKeyRepository, getKeyResolver } from "@/lib/router-keys";
import { getBalanceFresh } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What this key is allowed to do — the published half of the rate limit.
 *
 * The edge already *enforces* `rateLimitRps` and the per-key spend ceilings; a
 * limit nobody can read is a limit a buyer discovers by being refused. This
 * states the numbers, for the key that asks, over the same public `/v1`
 * surface the limits apply to. It is key-authenticated, not session
 * authenticated: the audience is the program holding the key.
 *
 * Static segment, so it takes precedence over the `[...path]` relay and is
 * never forwarded upstream.
 *
 * → `{key{id,name,prefix,status,expires_at}, rate_limit{requests_per_second},
 *    spend{currency, daily{limit,used,remaining}, total{limit,used,remaining}},
 *    balance{amount,currency}}`
 */
export async function GET(request: Request) {
  const credential = extractCredential(request);
  if (!credential) {
    return refuse(
      401,
      "missing_api_key",
      "Missing API key. Send `Authorization: Bearer <key>` or `x-api-key: <key>`.",
    );
  }

  const identity = await getKeyResolver()(credential);
  if (!identity) {
    return refuse(401, "invalid_api_key", "Invalid API key.");
  }

  const [spend, detail, balance] = await Promise.all([
    new RouterBillingRepository(getSystemDb()).getKeySpend(identity.keyId),
    getApiKeyRepository().findDetail(identity.tenantId, identity.keyId),
    getBalanceFresh(identity.tenantId),
  ]);

  if (!spend) {
    return refuse(401, "invalid_api_key", "Invalid API key.");
  }

  const remaining = (limit: number | null, used: number): number | null =>
    limit === null ? null : Math.max(0, limit - used);

  return Response.json(
    {
      key: {
        id: identity.keyId,
        name: detail?.name ?? null,
        prefix: detail?.keyPrefix ?? null,
        status: detail?.status ?? (spend.disabled ? "disabled" : "active"),
        expires_at: detail?.expiresAt?.toISOString() ?? null,
        save_logs: detail?.saveLogs ?? false,
      },
      rate_limit: {
        requests_per_second: spend.rateLimitRps,
        // Named so a client can tell which headers to expect on a 429.
        headers: ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "retry-after"],
      },
      spend: {
        currency: "USD",
        // The daily counter resets at midnight UTC — the same clock the
        // console buckets on, and the one stated in /help.
        reset_timezone: "UTC",
        daily: {
          limit: spend.limitDaily,
          used: spend.costDaily,
          remaining: remaining(spend.limitDaily, spend.costDaily),
        },
        total: {
          limit: spend.limitTotal,
          used: spend.costTotal,
          remaining: remaining(spend.limitTotal, spend.costTotal),
        },
      },
      balance: { amount: balance.balance, currency: balance.currency },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
