import { logger } from "@nebutra/logger";
import type { UsageResult } from "../types.js";

const REDIS_KEY_PREFIX = "model:pricing:";
const CACHE_TTL_SECONDS = 3600;
const TOKENS_PER_MILLION = 1_000_000;

export interface ModelPricing {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  currency: string;
}

/**
 * Conservative fallback pricing used when a model is not found in the
 * database. Chosen high enough to ensure we always charge *something* for an
 * unknown model — we prefer to slightly over-charge than to serve for free.
 */
export const DEFAULT_PRICING: ModelPricing = {
  inputPricePerMillion: 10.0,
  outputPricePerMillion: 30.0,
  currency: "USD",
};

/**
 * Calculate cost in dollars (not cents, not credits).
 *
 * The caller is responsible for converting dollars to the organization's
 * preferred credit unit (e.g. `dollarsToCredits()` from `@nebutra/billing`).
 */
export function calculateCost(usage: UsageResult, pricing: ModelPricing): number {
  const inputCost = (usage.promptTokens / TOKENS_PER_MILLION) * pricing.inputPricePerMillion;
  const outputCost = (usage.completionTokens / TOKENS_PER_MILLION) * pricing.outputPricePerMillion;
  return inputCost + outputCost;
}

export interface ModelConfigDeps {
  redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  };
  prisma: {
    modelConfig: {
      findUnique: (args: {
        where: { modelName: string };
      }) => Promise<(ModelPricing & { modelName: string }) | null>;
    };
  };
}

/**
 * Look up a model's pricing with Redis cache (1h TTL) and Prisma fallback.
 *
 * Resolution order:
 * 1. Redis cache hit → return cached pricing
 * 2. Prisma lookup succeeds → cache + return DB pricing
 * 3. Model unknown → cache + return `DEFAULT_PRICING`
 *
 * This function never throws for the "model not found" case — it always
 * resolves to a usable pricing object so billing never fails open.
 */
export async function getModelPricing(model: string, deps: ModelConfigDeps): Promise<ModelPricing> {
  const cacheKey = `${REDIS_KEY_PREFIX}${model}`;

  const cached = await deps.redis.get(cacheKey).catch((error) => {
    logger.warn("cost-calculator: Redis get failed", {
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (cached !== null) {
    try {
      const parsed = JSON.parse(cached) as ModelPricing;
      if (
        typeof parsed.inputPricePerMillion === "number" &&
        typeof parsed.outputPricePerMillion === "number" &&
        typeof parsed.currency === "string"
      ) {
        return {
          inputPricePerMillion: parsed.inputPricePerMillion,
          outputPricePerMillion: parsed.outputPricePerMillion,
          currency: parsed.currency,
        };
      }
    } catch {
      logger.warn("cost-calculator: malformed pricing in Redis cache", { model });
    }
  }

  const dbRecord = await deps.prisma.modelConfig
    .findUnique({ where: { modelName: model } })
    .catch((error) => {
      logger.warn("cost-calculator: Prisma lookup failed", {
        model,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });

  const pricing: ModelPricing = dbRecord
    ? {
        inputPricePerMillion: dbRecord.inputPricePerMillion,
        outputPricePerMillion: dbRecord.outputPricePerMillion,
        currency: dbRecord.currency,
      }
    : { ...DEFAULT_PRICING };

  await deps.redis
    .set(cacheKey, JSON.stringify(pricing), { ex: CACHE_TTL_SECONDS })
    .catch((error) => {
      logger.warn("cost-calculator: Redis set failed", {
        model,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return pricing;
}
