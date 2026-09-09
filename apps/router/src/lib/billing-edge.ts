import "server-only";

import { invalidateCreditCache } from "@nebutra/billing/credits";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { TokenBucket } from "@nebutra/rate-limit";
import {
  RequestLogRepository,
  RouterBillingRepository,
  type RouterKeySpend,
  type RouterPriceRow,
} from "@nebutra/repositories";
import {
  type ModelPriceRow,
  type PriceResult,
  type PriceUnit,
  priceUsage,
  reserveWorstCase,
} from "@nebutra/router-supply";
import type {
  EdgeAdmitDecision,
  EdgeAdmitInput,
  EdgeGuard,
  EdgeIdentity,
  EdgeRateLimiter,
  EdgeRefusalCode,
  EdgeSettleInput,
  ParsedUsage,
  RateLimitVerdict,
} from "./openai-edge";
import { getBalanceFresh } from "./wallet";

/**
 * The Router's money edge: what happens around a relayed request.
 *
 * **Reserve, then settle.** Before the upstream call the guard holds the
 * worst-case charge — an atomic conditional decrement of the tenant balance in
 * `RouterBillingRepository`. A fresh read alone would not do: two requests that
 * both read the same balance would both be admitted, and the second one is an
 * overdraw. Holding the money in the database is what makes the refusal true
 * across instances.
 *
 * **The hold is also a record.** The decrement is written together with a
 * `router_reservations` row keyed by the request id. Money that has left a
 * balance with nothing saying it is a hold cannot be recovered when the process
 * dies mid-request — and it does die, on every deploy. So admit sweeps this
 * tenant's expired holds before it prices anything, and a cron in the gateway
 * does the same for tenants who stopped calling.
 *
 * **Settlement is one transaction**: the `UsageLedgerEntry`, the release of the
 * unspent hold, the `CreditTransaction` and the per-key counters move together
 * or not at all. The ledger row's unique `(tenantId, idempotencyKey)` is the
 * idempotency check, so a retried settle moves nothing.
 *
 * **One request, two rows.** The ledger row is the money; `ai_request_logs`
 * is the request — model, status, first-byte time, upstream channel — and it
 * expires where the ledger does not. They are written from the same place so
 * a charge can never exist without the record of what produced it. The log is
 * best-effort: it is written after the customer already has their answer, and
 * a failure to write it must not undo a settled charge.
 *
 * **An unpriced model is refused, not relayed.** `priceUsage` returning
 * `ok:false` means we cannot say what a call costs; serving it anyway is
 * serving it for free.
 */

const MIN_RESERVATION = 0.0001;

function toPriceRow(row: RouterPriceRow): ModelPriceRow {
  return {
    modelName: row.modelName,
    unit: row.unit as PriceUnit,
    currency: row.currency,
    published: row.published,
    inputPerMTok: row.inputPerMTok,
    outputPerMTok: row.outputPerMTok,
    cacheReadPerMTok: row.cacheReadPerMTok,
    cacheWritePerMTok: row.cacheWritePerMTok,
    unitPrice: row.unitPrice,
  };
}

/**
 * The slice of the seam this file uses. Named so the guard can be tested
 * against a fake without a database, and so nothing here reaches for Prisma
 * directly — `RouterBillingRepository` owns every query.
 */
export type RouterBilling = Pick<
  RouterBillingRepository,
  "findPrice" | "getKeySpend" | "reserve" | "release" | "settle" | "sweepExpired"
>;

/** The log seam, narrowed the same way, so the guard stays testable. */
export type RouterRequestLog = Pick<RequestLogRepository, "record">;

function repo(): RouterBilling {
  return new RouterBillingRepository(getSystemDb());
}

function logRepo(): RouterRequestLog {
  return new RequestLogRepository(getSystemDb());
}

/**
 * Refund this tenant's expired holds, if any. Kept small (a handful of rows per
 * call) so it stays a cheap indexed query on the hot admit path; the global
 * cron owns the backlog. A failure here must not refuse a request the customer
 * can afford — worst case their money comes back a few minutes later.
 */
async function sweepTenant(billing: RouterBilling, tenantId: string): Promise<void> {
  try {
    const result = await billing.sweepExpired({ tenantId, limit: 8 });
    if (result.swept > 0) {
      invalidateCreditCache(tenantId);
      logger.warn("[router] returned expired reservations", {
        tenantId,
        swept: result.swept,
        refunded: result.refunded,
      });
    }
  } catch (error) {
    logger.error("[router] reservation sweep failed", { tenantId, error });
  }
}

/** Which per-key ceiling, if any, this charge would break. */
function overKeyLimit(spend: RouterKeySpend, amount: number): "daily" | "total" | null {
  if (spend.limitDaily !== null && spend.costDaily + amount > spend.limitDaily) return "daily";
  if (spend.limitTotal !== null && spend.costTotal + amount > spend.limitTotal) return "total";
  return null;
}

/**
 * `billing` is resolved per call, not at construction: the route builds the
 * guard at module scope and a Prisma client must not be created while a
 * serverless bundle is still being imported.
 */
export function createRouterGuard(
  injected?: RouterBilling,
  injectedLog?: RouterRequestLog,
): EdgeGuard {
  const db = () => injected ?? repo();
  const logs = () => injectedLog ?? logRepo();
  return {
    async admit(input: EdgeAdmitInput): Promise<EdgeAdmitDecision> {
      const billing = db();

      // Return this tenant's stranded holds before asking what they can afford.
      // A hold whose request died — a deploy restart mid-stream, an OOM — left
      // real money out of the balance; sweeping here makes an active customer
      // whole on their very next call, without waiting for the cron. One
      // indexed lookup on `(tenant_id, expires_at)`.
      await sweepTenant(billing, input.identity.tenantId);

      const spend = await billing.getKeySpend(input.identity.keyId);
      if (!spend || spend.disabled) {
        return {
          ok: false,
          status: 401,
          code: "key_disabled",
          message: "This API key is disabled.",
        };
      }

      // Price every candidate; drop the ones we cannot price. The reservation is
      // the most expensive survivor, because failover may land on any of them.
      const priced: Array<{ model: string; price: PriceResult }> = [];
      let sawRow = false;
      let sawUnpublished = false;
      for (const model of input.models) {
        const row = await billing.findPrice(model);
        if (!row) continue;
        sawRow = true;
        if (!row.published || !row.isActive) {
          sawUnpublished = true;
          continue;
        }
        const price = reserveWorstCase(
          model,
          { promptTokens: input.promptTokens, maxOutputTokens: input.maxOutputTokens },
          toPriceRow(row),
        );
        if (price.ok) priced.push({ model, price });
      }

      if (priced.length === 0) {
        return sawUnpublished || sawRow
          ? {
              ok: false,
              status: 403,
              code: "model_not_published",
              message: `Model \`${input.models[0]}\` is not available on this router.`,
            }
          : {
              ok: false,
              status: 404,
              code: "unknown_model",
              message: `Unknown model \`${input.models[0]}\`.`,
            };
      }

      const reserved = Math.max(
        MIN_RESERVATION,
        ...priced.map((p) => (p.price.ok ? p.price.totalCost : 0)),
      );

      const breached = overKeyLimit(spend, reserved);
      if (breached) {
        return {
          ok: false,
          status: 402,
          code: "key_quota_exceeded",
          message:
            breached === "daily"
              ? "This API key has reached its daily spend limit (UTC). Raise the limit or wait for the next UTC day."
              : "This API key has reached its total spend limit. Raise the limit or use another key.",
        };
      }

      const held = await billing.reserve({
        tenantId: input.identity.tenantId,
        requestId: input.requestId,
        keyId: input.identity.keyId,
        amount: reserved,
      });
      // The hold moved money; anything the billing cache still holds is stale.
      invalidateCreditCache(input.identity.tenantId);
      if (!held) {
        return {
          ok: false,
          status: 402,
          code: "insufficient_balance",
          message: "Insufficient balance. Top up to continue.",
        };
      }

      return {
        ok: true,
        admission: {
          reserved,
          currency: "USD",
          candidates: priced.map((p) => p.model),
        },
      };
    },

    async admitUnpriced(
      input,
    ): Promise<
      { ok: true } | { ok: false; status: number; code: EdgeRefusalCode; message: string }
    > {
      const billing = db();
      const spend = await billing.getKeySpend(input.identity.keyId);
      if (!spend || spend.disabled) {
        return {
          ok: false,
          status: 401,
          code: "key_disabled",
          message: "This API key is disabled.",
        };
      }

      // The key's own ceilings still apply even when the charge is unknown.
      const breached = overKeyLimit(spend, 0);
      if (breached) {
        return {
          ok: false,
          status: 402,
          code: "key_quota_exceeded",
          message:
            breached === "daily"
              ? "This API key has reached its daily spend limit (UTC). Raise the limit or wait for the next UTC day."
              : "This API key has reached its total spend limit. Raise the limit or use another key.",
        };
      }

      // Fresh, never the cached read: a stale positive balance on a second
      // instance is exactly how a zero-balance key would get in. See A1 in the
      // task's decisions.md.
      const balance = await getBalanceFresh(input.identity.tenantId);
      if (!(balance.balance > 0)) {
        return {
          ok: false,
          status: 402,
          code: "insufficient_balance",
          message: "Insufficient balance. Top up to continue.",
        };
      }
      return { ok: true };
    },

    async noteRefusal(input): Promise<void> {
      // Cheap by construction: one insert, no key lookup, nothing
      // prompt-derived. The customer gets the fact and the reason; the reason
      // is our own refusal code, not anything they sent.
      await logs()
        .record({
          requestId: input.requestId,
          tenantId: input.identity.tenantId,
          apiKeyId: input.identity.keyId,
          model: input.model ?? "unknown",
          path: input.path,
          httpStatus: input.status,
          status: "refused",
          cost: 0,
          errorMessage: input.code,
        })
        .catch(() => false);
    },

    async settle(input: EdgeSettleInput): Promise<void> {
      const billing = db();
      const model = pickSettledModel(input);
      // Post-paid (a multipart upload) whose `model` field never appeared in the
      // scanned prefix. Nothing can be priced, so nothing is charged — but the
      // gap is named out loud, because a silent one is free inference.
      if (!input.admission && model === "unknown") {
        logger.warn("[router] post-paid request settled with no readable model", {
          requestId: input.requestId,
          path: input.path,
          status: input.status,
          keyId: input.identity.keyId,
          tenantId: input.identity.tenantId,
        });
      }
      const price =
        input.billable && model !== "unknown"
          ? await priceSettled(billing, model, input.usage)
          : zeroPrice(model, model === "unknown" ? "model_unreadable" : undefined);

      // `saveLogs` is the customer's own switch over prompt-derived detail.
      // Read here rather than carried from admit because settle runs after the
      // response has finished — it is off the latency path, and a key whose
      // owner turned logging off mid-request should have that honoured.
      const spend = await billing.getKeySpend(input.identity.keyId).catch(() => null);

      try {
        const result = await billing.settle({
          tenantId: input.identity.tenantId,
          userId: input.identity.userId,
          keyId: input.identity.keyId,
          requestId: input.requestId,
          idempotencyKey: `router:${input.requestId}`,
          model,
          quantity: price.quantity,
          unit: price.unit,
          unitCost: price.unitCost,
          totalCost: price.totalCost,
          currency: input.admission?.currency ?? "USD",
          // No admission means no hold was ever taken (post-paid). Zero is the
          // truth here, not a placeholder: `settle` finds no reservation row,
          // returns nothing, and debits the charge.
          reserved: input.admission?.reserved ?? 0,
          metadata: {
            product: "router",
            path: input.path,
            keyId: input.identity.keyId,
            promptTokens: input.usage.promptTokens,
            completionTokens: input.usage.completionTokens,
            cachedPromptTokens: input.usage.cachedPromptTokens,
            cacheWriteTokens: input.usage.cacheWriteTokens,
            status: input.status,
            latencyMs: input.latencyMs,
            supplyPath: input.supplyPath,
            reserved: input.admission?.reserved ?? 0,
            postPaid: input.admission === null,
            billable: input.billable,
            ...(input.billable ? {} : { refundReason: refundReason(input) }),
            ...(price.unpriced ? { unpriced: price.unpriced } : {}),
          },
        });
        if (!result.settled) {
          logger.warn("[router] settle ignored as duplicate", { requestId: input.requestId });
        }
      } finally {
        invalidateCreditCache(input.identity.tenantId);
        await writeRequestLog(logs(), input, model, price, spend?.saveLogs ?? false);
      }
    },

    async abandon(input): Promise<void> {
      await db().release({
        tenantId: input.identity.tenantId,
        requestId: input.requestId,
        amount: input.admission.reserved,
      });
      invalidateCreditCache(input.identity.tenantId);
      logger.warn("[router] reservation released, upstream never answered", {
        requestId: input.requestId,
      });
    },
  };
}

/**
 * The request record. Best-effort by construction: the repository swallows its
 * own failures, and this is called from a `finally` so a log problem can never
 * roll back money that is already settled.
 */
async function writeRequestLog(
  logs: RouterRequestLog,
  input: EdgeSettleInput,
  model: string,
  price: SettledPrice,
  saveLogs: boolean,
): Promise<void> {
  await logs.record({
    requestId: input.requestId,
    tenantId: input.identity.tenantId,
    apiKeyId: input.identity.keyId,
    model,
    path: input.path,
    httpStatus: input.status,
    status: input.billable ? "success" : "error",
    latencyMs: input.latencyMs,
    ttfbMs: input.ttfbMs,
    promptTokens: input.usage.promptTokens,
    completionTokens: input.usage.completionTokens,
    totalTokens: input.usage.totalTokens,
    cachedPromptTokens: input.usage.cachedPromptTokens,
    cacheWriteTokens: input.usage.cacheWriteTokens,
    cost: price.totalCost,
    supplyPath: input.supplyPath,
    clientIp: input.clientIp,
    errorMessage: input.billable ? null : refundReason(input),
    saveLogs,
  });
}

interface SettledPrice {
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  unpriced?: string;
}

function zeroPrice(_model: string, unpriced?: string): SettledPrice {
  return {
    quantity: 0,
    unit: "token",
    unitCost: 0,
    totalCost: 0,
    ...(unpriced ? { unpriced } : {}),
  };
}

/**
 * What the model reported it is, when it reported anything — a `models[]`
 * fallback means the served model is not necessarily the requested one.
 */
function pickSettledModel(input: EdgeSettleInput): string {
  if (input.usage.model && input.usage.model !== "unknown") return input.usage.model;
  return input.admission?.candidates[0] ?? "unknown";
}

async function priceSettled(
  billing: RouterBilling,
  model: string,
  usage: ParsedUsage,
): Promise<SettledPrice> {
  const row = await billing.findPrice(model);
  const result = priceUsage(
    model,
    {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedPromptTokens: usage.cachedPromptTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      calls: 1,
      // Non-token quantities, for the units an image or audio SKU is sold in.
      // The price row picks which one it reads; the parser reports whatever the
      // upstream actually returned and never guesses the rest.
      images: usage.images,
      seconds: usage.seconds,
      minutes: usage.seconds > 0 ? usage.seconds / 60 : 0,
    },
    row ? toPriceRow(row) : null,
  );
  if (!result.ok) {
    // Admission priced this model; if settlement cannot, the customer is not
    // charged for our gap. It is logged as an operator problem, not theirs.
    logger.error("[router] settled an unpriced model", { model, reason: result.reason });
    return { ...zeroPrice(model), unpriced: result.reason };
  }
  return {
    quantity: result.quantity,
    unit: unitLabel(result.unit),
    unitCost: result.unitCost,
    totalCost: result.totalCost,
  };
}

function unitLabel(unit: string): string {
  switch (unit) {
    case "PER_1M_TOKENS":
      return "token";
    case "PER_1M_CHARS":
      return "char";
    case "PER_IMAGE":
      return "image";
    case "PER_SECOND":
      return "second";
    case "PER_MINUTE":
      return "minute";
    case "PER_PAGE":
      return "page";
    default:
      return "call";
  }
}

function refundReason(input: EdgeSettleInput): string {
  if (input.status < 200 || input.status >= 300) return `upstream_status_${input.status}`;
  if (input.usage.errored) return "error_in_body";
  return "zero_completion";
}

/**
 * Per-key request rate. The bucket lives in this process, like every other
 * rate limit in the repo today; `RedisTokenBucket` from `@nebutra/rate-limit`
 * swaps in unchanged when the Router runs on more than one machine.
 */
const buckets = new Map<number, TokenBucket>();

function bucketFor(rps: number): TokenBucket {
  let bucket = buckets.get(rps);
  if (!bucket) {
    bucket = new TokenBucket({ maxTokens: rps, refillRate: rps, refillInterval: 1000 });
    buckets.set(rps, bucket);
  }
  return bucket;
}

export function createRouterRateLimiter(
  lookup: (keyId: string) => Promise<RouterKeySpend | null> = (keyId) => repo().getKeySpend(keyId),
): EdgeRateLimiter {
  return async (identity: EdgeIdentity): Promise<RateLimitVerdict> => {
    const spend = await lookup(identity.keyId).catch(() => null);
    const rps = spend?.rateLimitRps && spend.rateLimitRps > 0 ? spend.rateLimitRps : 10;
    const result = await bucketFor(rps).consume(`router:key:${identity.keyId}`, 1);
    return {
      allowed: result.allowed,
      limit: rps,
      remaining: result.remaining,
      resetAt: result.resetAt,
      ...(result.retryAfter !== undefined ? { retryAfterSeconds: result.retryAfter } : {}),
    };
  };
}
